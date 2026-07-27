-- Finance Management
-- Collected student fees remain sourced from public.payments.
-- This migration adds an audited, non-destructive expense ledger and a
-- teacher-only income view that deliberately excludes expected fees.

CREATE TYPE public.finance_expense_status AS ENUM ('POSTED', 'VOID');
CREATE TYPE public.finance_payment_method AS ENUM (
  'CASH',
  'BANK_TRANSFER',
  'BKASH',
  'NAGAD',
  'CARD',
  'CHEQUE',
  'OTHER'
);

CREATE TABLE public.finance_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code = lower(code) AND code ~ '^[a-z0-9_]+$'),
  name TEXT NOT NULL UNIQUE CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  color_hex TEXT NOT NULL DEFAULT '#64748B'
    CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.finance_expense_categories
  (code, name, color_hex, display_order)
VALUES
  ('rent_utilities', 'Rent & Utility', '#4F46E5', 10),
  ('sheets_printing', 'Sheets Making & Printing', '#0EA5E9', 20),
  ('question_printing', 'Question Making & Printing', '#06B6D4', 30),
  ('exam_guard', 'Exam Guard', '#8B5CF6', 40),
  ('script_evaluation', 'Exam Script Evaluation', '#EC4899', 50),
  ('stationery', 'Markers, Duster & Stationery', '#F59E0B', 60),
  ('transportation', 'Transportation', '#10B981', 70),
  ('events', 'Events (Iftar, Farewell, etc.)', '#F97316', 80),
  ('other', 'Other', '#64748B', 90)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  color_hex = EXCLUDED.color_hex,
  display_order = EXCLUDED.display_order;

CREATE TABLE public.finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL
    REFERENCES public.finance_expense_categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0 AND amount <= 9999999999.99),
  expense_date DATE NOT NULL,
  payment_method public.finance_payment_method NOT NULL DEFAULT 'CASH',
  payee TEXT CHECK (payee IS NULL OR char_length(btrim(payee)) <= 120),
  reference_number TEXT
    CHECK (reference_number IS NULL OR char_length(btrim(reference_number)) <= 100),
  description TEXT
    CHECK (description IS NULL OR char_length(btrim(description)) <= 2000),
  receipt_storage_path TEXT
    CHECK (
      receipt_storage_path IS NULL
      OR receipt_storage_path LIKE 'finance/receipts/%'
    ),
  receipt_file_name TEXT
    CHECK (receipt_file_name IS NULL OR char_length(btrim(receipt_file_name)) <= 180),
  receipt_content_type TEXT
    CHECK (receipt_content_type IS NULL OR char_length(btrim(receipt_content_type)) <= 100),
  receipt_size_bytes BIGINT
    CHECK (receipt_size_bytes IS NULL OR receipt_size_bytes BETWEEN 1 AND 10485760),
  status public.finance_expense_status NOT NULL DEFAULT 'POSTED',
  void_reason TEXT
    CHECK (void_reason IS NULL OR char_length(btrim(void_reason)) BETWEEN 3 AND 500),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT finance_expense_void_state_check CHECK (
    (
      status = 'POSTED'
      AND void_reason IS NULL
      AND voided_at IS NULL
      AND voided_by IS NULL
    )
    OR
    (
      status = 'VOID'
      AND void_reason IS NOT NULL
      AND voided_at IS NOT NULL
      AND voided_by IS NOT NULL
    )
  ),
  CONSTRAINT finance_expense_receipt_metadata_check CHECK (
    (
      receipt_storage_path IS NULL
      AND receipt_file_name IS NULL
      AND receipt_content_type IS NULL
      AND receipt_size_bytes IS NULL
    )
    OR
    (
      receipt_storage_path IS NOT NULL
      AND receipt_file_name IS NOT NULL
      AND receipt_content_type IS NOT NULL
      AND receipt_size_bytes IS NOT NULL
    )
  )
);

CREATE TRIGGER update_finance_expenses_modtime
  BEFORE UPDATE ON public.finance_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_finance_expenses_date_status
  ON public.finance_expenses(expense_date DESC, status);
CREATE INDEX idx_finance_expenses_category_date
  ON public.finance_expenses(category_id, expense_date DESC);
CREATE INDEX idx_finance_expenses_method_date
  ON public.finance_expenses(payment_method, expense_date DESC);

-- A secure read model for actual fee collection. It intentionally exposes no
-- expected_amount column, so forecast/dues cannot accidentally become income.
CREATE VIEW public.finance_income_ledger
WITH (security_invoker = true)
AS
SELECT
  p.id AS payment_id,
  COALESCE(p.payment_date, p.confirmed_at::date, p.created_at::date) AS transaction_date,
  p.paid_amount AS amount,
  p.status,
  p.payment_method,
  p.reference_number,
  p.billing_month,
  p.billing_year,
  p.student_id,
  p.batch_id,
  sp.student_code,
  pr.full_name AS student_name,
  b.name AS batch_name,
  b.code AS batch_code,
  p.created_at,
  p.updated_at
FROM public.payments p
JOIN public.student_profiles sp ON sp.id = p.student_id
JOIN public.profiles pr ON pr.id = sp.profile_id
JOIN public.batches b ON b.id = p.batch_id
WHERE p.status IN ('PAID', 'PARTIALLY_PAID')
  AND p.paid_amount > 0;

ALTER TABLE public.finance_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_finance_expense_categories
  ON public.finance_expense_categories
  FOR SELECT TO authenticated
  USING (public.is_active_teacher());

CREATE POLICY select_finance_expenses
  ON public.finance_expenses
  FOR SELECT TO authenticated
  USING (public.is_active_teacher());

CREATE POLICY insert_finance_expenses
  ON public.finance_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_teacher()
    AND created_by = public.current_profile_id()
    AND updated_by = public.current_profile_id()
  );

CREATE POLICY update_finance_expenses
  ON public.finance_expenses
  FOR UPDATE TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (
    public.is_active_teacher()
    AND updated_by = public.current_profile_id()
  );

GRANT SELECT ON public.finance_expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.finance_expenses TO authenticated;
GRANT SELECT ON public.finance_income_ledger TO authenticated;

COMMENT ON TABLE public.finance_expenses IS
  'Actual operating expenses. Records are voided instead of hard-deleted to preserve the accounting trail.';
COMMENT ON VIEW public.finance_income_ledger IS
  'Actual collected student fees only. Expected fees and unpaid dues are excluded by design.';
