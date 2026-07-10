import re

with open('src/components/layout/Navbar.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# The error happens because the replacement had a literal slash backslash escape
# I will use a simple regex to replace that line.
pattern = r"(\?\s+)\\`/\$\\{sub\.href\\}\\`"
new_code = re.sub(r"\? \\\`\/\$\\{sub\.href\\}\\\`", "? `/${sub.href}`", code)

# Let's be less strict. We know what line 445 says.
# We will just replace the exact text
lines = code.split('\n')
for i, line in enumerate(lines):
    if "sub.href.startsWith" in line:
        # The next two lines might be the broken ones
        if lines[i+1].strip() == "? \\`/${sub.href}\\`":
            lines[i+1] = "                              ? `/${sub.href}`"
        elif lines[i+1].strip() == "? \\`/${sub.href}\\`".replace("\\\\", "\\"):
             lines[i+1] = "                              ? `/${sub.href}`"
        elif "?" in lines[i+1]:
             lines[i+1] = "                              ? `/${sub.href}`"

with open('src/components/layout/Navbar.tsx', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
