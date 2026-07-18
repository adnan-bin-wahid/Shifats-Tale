"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  TrendingUp, TrendingDown, Target, Award, AlertTriangle, 
  Calendar, CheckCircle2, Filter, Clock, Eye, BarChart3, Search
} from "lucide-react";
import { motion } from "framer-motion";

export function StudentAnalyticsDashboard({ exams, activeBatches }: { exams: any[], activeBatches: any[] }) {
  // State for Filters
  const [search, setSearch] = useState("");
  const [filterBatch, setFilterBatch] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("LATEST");

  // Filtered & Sorted Exams
  const filteredExams = useMemo(() => {
    let result = [...exams];
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q) || e.batches?.name.toLowerCase().includes(q));
    }
    
    if (filterBatch !== "ALL") {
      result = result.filter(e => e.batch_id === filterBatch);
    }
    
    if (filterStatus !== "ALL") {
      if (filterStatus === "GRADED") result = result.filter(e => e.status === "RESULT_PUBLISHED");
      if (filterStatus === "UPCOMING") result = result.filter(e => e.status !== "RESULT_PUBLISHED");
      if (filterStatus === "PASSED") result = result.filter(e => e.result && Number(e.result.obtained_marks) >= Number(e.pass_marks));
      if (filterStatus === "FAILED") result = result.filter(e => e.result && Number(e.result.obtained_marks) < Number(e.pass_marks) && e.result.attendance_status !== "ABSENT");
      if (filterStatus === "MISSED") result = result.filter(e => e.result && e.result.attendance_status === "ABSENT");
    }

    result.sort((a, b) => {
      if (sortBy === "LATEST") return new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime();
      if (sortBy === "OLDEST") return new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime();
      
      const aScore = a.result?.obtained_marks ? (Number(a.result.obtained_marks) / Number(a.total_marks)) : -1;
      const bScore = b.result?.obtained_marks ? (Number(b.result.obtained_marks) / Number(b.total_marks)) : -1;
      
      if (sortBy === "HIGHEST") return bScore - aScore;
      if (sortBy === "LOWEST") {
        if (aScore === -1) return 1;
        if (bScore === -1) return -1;
        return aScore - bScore;
      }
      return 0;
    });

    return result;
  }, [exams, search, filterBatch, filterStatus, sortBy]);


  // Calculate Core Metrics (From Graded Exams ONLY)
  const gradedExams = exams.filter(e => e.status === "RESULT_PUBLISHED" && e.result);
  
  // Sort graded exams chronologically for trend analysis
  const chronoGraded = [...gradedExams].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
  
  const totalGraded = gradedExams.length;
  let passedCount = 0;
  let failedCount = 0;
  let highestPercentage = 0;
  let lowestPercentage = 101;
  let bestExam: any = null;
  let worstExam: any = null;
  let totalPercentageSum = 0;

  const lineChartData: any[] = [];
  const marksDistribution = {
    "90-100%": 0, "80-89%": 0, "70-79%": 0, "60-69%": 0, "< 60%": 0
  };

  const batchPerformance: Record<string, { total: number, count: number, name: string }> = {};

  chronoGraded.forEach((exam) => {
    const isAbsent = exam.result.attendance_status === "ABSENT";
    if (isAbsent) {
      failedCount++;
      return; // Skip from percentage averages
    }

    const marks = Number(exam.result.obtained_marks) || 0;
    const total = Number(exam.total_marks) || 100;
    const pass = Number(exam.pass_marks) || 0;
    
    const percentage = (marks / total) * 100;
    totalPercentageSum += percentage;

    if (marks >= pass) passedCount++; else failedCount++;
    
    if (percentage > highestPercentage) {
      highestPercentage = percentage;
      bestExam = exam;
    }
    
    if (percentage < lowestPercentage) {
      lowestPercentage = percentage;
      worstExam = exam;
    }

    // Chart Data
    const shortDate = new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const shortName = exam.name.substring(0, 10) + (exam.name.length > 10 ? "..." : "");
    lineChartData.push({
      name: shortName,
      xAxisLabel: `${shortName}||${shortDate}`,
      score: Math.round(percentage),
      marks: marks,
      fullDate: exam.exam_date,
      shortDate: shortDate,
      fullName: exam.name,
      grade: exam.result?.grade || "-"
    });

    // Histogram
    if (percentage >= 90) marksDistribution["90-100%"]++;
    else if (percentage >= 80) marksDistribution["80-89%"]++;
    else if (percentage >= 70) marksDistribution["70-79%"]++;
    else if (percentage >= 60) marksDistribution["60-69%"]++;
    else marksDistribution["< 60%"]++;

    // Radar / Batch Average
    const batchName = exam.batches?.code || exam.batches?.name || "Unknown";
    if (!batchPerformance[batchName]) batchPerformance[batchName] = { total: 0, count: 0, name: batchName };
    batchPerformance[batchName].total += percentage;
    batchPerformance[batchName].count++;
  });

  const overallAverage = totalGraded > 0 ? (totalPercentageSum / (totalGraded - (gradedExams.filter(e => e.result?.attendance_status === "ABSENT").length))) : 0;
  
  // Recent Trend (Last 3 vs Previous 3)
  let trendMsg = "Not enough data";
  let trendState = "stable"; // "improving" | "declining" | "stable"
  let trendDiff = 0;
  
  const calculateTrendState = (diff: number) => {
    if (diff > 1) return "improving";
    if (diff < -1) return "declining";
    return "stable";
  };
  
  if (lineChartData.length >= 4) {
    const last3 = lineChartData.slice(-3).reduce((sum, item) => sum + item.score, 0) / 3;
    const prev3 = lineChartData.slice(Math.max(0, lineChartData.length - 6), lineChartData.length - 3).reduce((sum, item) => sum + item.score, 0) / Math.min(3, lineChartData.length - 3);
    trendDiff = last3 - prev3;
    trendState = calculateTrendState(trendDiff);
    trendMsg = trendState === "stable" ? `Changed ${trendDiff > 0 ? '+' : ''}${trendDiff.toFixed(1)}% vs previous` : `${trendState === 'improving' ? 'Improving ↑' : 'Declining ↓'} ${Math.abs(trendDiff).toFixed(1)}% vs previous`;
  } else if (lineChartData.length > 1) {
    trendDiff = lineChartData[lineChartData.length-1].score - lineChartData[lineChartData.length-2].score;
    trendState = calculateTrendState(trendDiff);
    trendMsg = trendState === "stable" ? `Changed ${trendDiff > 0 ? '+' : ''}${trendDiff.toFixed(1)}% from last exam` : `${trendState === 'improving' ? 'Improving ↑' : 'Declining ↓'} ${Math.abs(trendDiff).toFixed(1)}% from last exam`;
  }

  // Format Chart Data
  const radarData = Object.values(batchPerformance).map(b => ({
    subject: b.name,
    score: Math.round(b.total / b.count),
    fullMark: 100
  }));

  const pieData = [
    { name: 'Passed', value: passedCount, color: '#059669' },
    { name: 'Failed', value: failedCount, color: '#e11d48' },
    { name: 'Pending', value: exams.length - totalGraded, color: '#94a3b8' }
  ].filter(d => d.value > 0);

  const histData = Object.keys(marksDistribution).map(k => ({
    range: k,
    count: marksDistribution[k as keyof typeof marksDistribution]
  }));

  // Identify Weaknesses
  const weakestSubjects = [...radarData].sort((a, b) => a.score - b.score).slice(0, 2);

  // Default Target
  const TARGET_SCORE = 80;

  const CustomLineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-border/60 rounded-xl shadow-lg">
          <p className="text-xs font-black text-primary mb-1">{data.fullName}</p>
          <p className="text-[10px] text-muted font-bold mb-2">{data.fullDate}</p>
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs font-bold text-slate-600">Marks:</span>
            <span className="text-xs font-black text-primary">{data.marks}</span>
          </div>
          <div className="flex justify-between items-center gap-4 mt-1">
            <span className="text-xs font-bold text-slate-600">Percentage:</span>
            <span className="text-xs font-black text-primary">{data.score}%</span>
          </div>
          <div className="flex justify-between items-center gap-4 mt-1">
            <span className="text-xs font-bold text-slate-600">Grade:</span>
            <span className="text-xs font-black text-primary">{data.grade}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const parts = payload.value.split("||");
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#64748B" fontSize={9} fontWeight={700}>
          {parts[0]}
        </text>
        {parts[1] && (
          <text x={0} y={0} dy={28} textAnchor="middle" fill="#94a3b8" fontSize={8} fontWeight={600}>
            {parts[1]}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Average */}
        <div className="bg-primary text-white p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Target className="w-24 h-24" />
          </div>
          <p className="text-[10px] uppercase font-bold tracking-wider opacity-80 mb-1">Overall Average</p>
          <p className="text-3xl font-black font-display">{overallAverage ? overallAverage.toFixed(1) : "0"}%</p>
        </div>
        
        {/* Total */}
        <div className="bg-white border border-border/60 p-4 rounded-2xl shadow-sm">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-1">Total Exams</p>
          <p className="text-3xl font-black font-display text-primary">{exams.length}</p>
          <p className="text-[9px] font-bold text-muted mt-1">Graded: {totalGraded} | Pending: {exams.length - totalGraded}</p>
        </div>

        {/* Pass/Fail */}
        <div className="bg-white border border-border/60 p-4 rounded-2xl shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mb-0.5">Passed</p>
              <p className="text-xl font-black font-display text-emerald-700">{passedCount}</p>
            </div>
            <div className="w-[1px] h-8 bg-border/60"></div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-rose-600 mb-0.5">Failed</p>
              <p className="text-xl font-black font-display text-rose-700">{failedCount}</p>
            </div>
          </div>
        </div>

        {/* Best Score */}
        <div className="bg-white border border-border/60 p-4 rounded-2xl shadow-sm">
          <p className="text-[10px] uppercase font-bold tracking-wider text-accent mb-1 flex items-center gap-1">
            <Award className="w-3 h-3" /> Best Score
          </p>
          <p className="text-2xl font-black font-display text-primary">{highestPercentage ? highestPercentage.toFixed(0) : "0"}%</p>
          <p className="text-[9px] font-bold text-muted mt-1 truncate" title={bestExam?.name}>{bestExam?.name || "N/A"}</p>
        </div>

        {/* Latest Score */}
        <div className="bg-white border border-border/60 p-4 rounded-2xl shadow-sm">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Latest Score
          </p>
          <p className="text-2xl font-black font-display text-primary">
            {lineChartData.length > 0 ? lineChartData[lineChartData.length-1].score.toFixed(0) : "0"}%
          </p>
          <p className="text-[9px] font-bold text-muted mt-1 truncate">{lineChartData.length > 0 ? lineChartData[lineChartData.length-1].name : "N/A"}</p>
        </div>

        {/* Streak / Trend */}
        <div className={`p-4 rounded-2xl shadow-sm border ${trendState === 'improving' ? 'bg-emerald-50 border-emerald-100' : trendState === 'declining' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${trendState === 'improving' ? 'text-emerald-700' : trendState === 'declining' ? 'text-rose-700' : 'text-slate-600'}`}>
            Performance Trend
          </p>
          <div className="flex items-center gap-2 mt-2">
            {trendState === 'improving' ? <TrendingUp className="w-6 h-6 text-emerald-600" /> : trendState === 'declining' ? <TrendingDown className="w-6 h-6 text-rose-600" /> : <TrendingUp className="w-6 h-6 text-slate-400" />}
            <span className={`text-lg font-black font-display ${trendState === 'improving' ? 'text-emerald-700' : trendState === 'declining' ? 'text-rose-700' : 'text-slate-600'}`}>
              {trendDiff > 0 ? '+' : ''}{trendDiff ? trendDiff.toFixed(1) : "0"}%
            </span>
          </div>
          <p className={`text-[9px] font-bold mt-1 ${trendState === 'improving' ? 'text-emerald-600/80' : trendState === 'declining' ? 'text-rose-600/80' : 'text-slate-500'}`}>{trendMsg}</p>
        </div>
      </div>

      {/* 2. Charts Section */}
      {lineChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trend Line Chart */}
          <div className="lg:col-span-2 bg-white border border-border/60 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" /> Score Trend
            </h3>
            <div className="h-[270px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 15, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="xAxisLabel" axisLine={false} tickLine={false} tick={<CustomXAxisTick />} />
                  <YAxis dataKey="marks" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} ticks={[0, 25, 45, 75, 100]} domain={[0, 100]} />
                  <ReferenceLine y={45} stroke="#e11d48" strokeDasharray="4 4" strokeWidth={1} />
                  <RechartsTooltip content={CustomLineTooltip} cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="marks" stroke="#010E62" strokeWidth={3} dot={{ r: 4, fill: '#FBB503', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#010E62' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar Chart (Chapter Mastery) */}
          <div className="bg-white border border-border/60 rounded-2xl p-5 shadow-sm flex flex-col">
            <h3 className="text-sm font-black text-primary mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" /> Subject Mastery
            </h3>
            <div className="flex-grow h-[220px]">
              {radarData.length >= 3 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="score" stroke="#FBB503" fill="#FBB503" fillOpacity={0.4} />
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={radarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="subject" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }} width={80} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="score" fill="#FBB503" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <p className="text-xs text-muted font-bold">Subject Mastery unavailable.</p>
                  <p className="text-[10px] text-muted/70 mt-1 font-semibold max-w-[180px]">Complete exams in subjects to unlock insights.</p>
                </div>
              )}
            </div>
          </div>

          {/* Histogram (Marks Distribution) */}
          <div className="bg-white border border-border/60 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" /> Marks Distribution
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748B', fontWeight: 700 }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748B', fontWeight: 700 }} allowDecimals={false} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', fontSize: '12px', color: '#1e293b' }}/>
                  <Bar dataKey="count" fill="#010E62" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart (Pass/Fail) */}
          <div className="bg-white border border-border/60 rounded-2xl p-5 shadow-sm flex flex-col">
            <h3 className="text-sm font-black text-primary mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" /> Exam Status
            </h3>
            <div className="flex-grow h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', color: '#1e293b' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Smart Insights & Goals */}
          <div className="bg-gradient-to-br from-[#010E62] to-[#0A1B5E] text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
              <Award className="w-32 h-32" />
            </div>
            
            <h3 className="text-sm font-black text-accent mb-4 flex items-center gap-2 relative z-10">
              <Target className="w-4 h-4" /> Actionable Insights
            </h3>
            
            <div className="space-y-4 relative z-10">
              {/* Strength */}
              {bestExam && (
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Strongest Exam</p>
                  <p className="text-xs font-semibold truncate" title={bestExam.name}>{bestExam.name} — {highestPercentage.toFixed(0)}%</p>
                </div>
              )}
              
              {/* Weakness */}
              {worstExam && (
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-rose-400 mb-1">Needs Focus</p>
                  <p className="text-xs font-semibold truncate" title={worstExam.name}>{worstExam.name} — {lowestPercentage.toFixed(0)}%</p>
                </div>
              )}

              {/* Goal Progress */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex justify-between items-end mb-2">
                  <p className="text-[10px] uppercase font-bold text-white/70">Goal Progress</p>
                  <p className="text-xs font-black">{overallAverage.toFixed(1)}% / {TARGET_SCORE}%</p>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (overallAverage / TARGET_SCORE) * 100)}%` }}
                  ></div>
                </div>
                {overallAverage >= TARGET_SCORE && (
                  <p className="text-[10px] text-emerald-300 font-bold">Goal achieved! Try setting {TARGET_SCORE + 5}% as your next target.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 3. Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-border/40 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-64">
          <div className="relative w-full h-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search exams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold focus:border-primary focus:outline-none placeholder:text-muted/70 text-primary"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs font-bold text-primary bg-bg/20 border border-border/60 rounded-xl focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="GRADED">Graded</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="MISSED">Missed</option>
          </select>
          
          <select 
            value={filterBatch} 
            onChange={(e) => setFilterBatch(e.target.value)}
            className="px-3 py-2 text-xs font-bold text-primary bg-bg/20 border border-border/60 rounded-xl focus:border-primary focus:outline-none max-w-[150px] truncate"
          >
            <option value="ALL">All Batches</option>
            {activeBatches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs font-bold text-primary bg-bg/20 border border-border/60 rounded-xl focus:border-primary focus:outline-none"
          >
            <option value="LATEST">Latest First</option>
            <option value="OLDEST">Oldest First</option>
            <option value="HIGHEST">Highest Marks</option>
            <option value="LOWEST">Lowest Marks</option>
          </select>
        </div>
      </div>

      {/* 4. Detailed Table */}
      <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {filteredExams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border/30 text-muted uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-4 px-6">Examination</th>
                  <th className="py-4 px-6">Class Batch</th>
                  <th className="py-4 px-6 text-center">Config</th>
                  <th className="py-4 px-6 text-center">Score</th>
                  <th className="py-4 px-6 text-center">Grade</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-primary">
                {filteredExams.map((exam) => {
                  const isPublished = exam.status === "RESULT_PUBLISHED";
                  const result = exam.result;
                  const isAbs = result?.attendance_status === "ABSENT";
                  const marks = result?.obtained_marks ? Number(result.obtained_marks) : 0;
                  const total = Number(exam.total_marks);
                  const pass = Number(exam.pass_marks);
                  const passes = marks >= pass;
                  
                  // Status Logic
                  let statusLabel = "";
                  let statusStyle = "";
                  
                  if (!isPublished) {
                    if (new Date(exam.exam_date).getTime() > Date.now()) {
                      statusLabel = "UPCOMING";
                      statusStyle = "bg-blue-50 text-blue-600 border-blue-100";
                    } else {
                      statusLabel = "NOT PUBLISHED";
                      statusStyle = "bg-slate-50 text-slate-600 border-slate-200";
                    }
                  } else if (!result || result.obtained_marks === null) {
                    statusLabel = "PENDING";
                    statusStyle = "bg-amber-50 text-amber-600 border-amber-100";
                  } else if (isAbs) {
                    statusLabel = "MISSED";
                    statusStyle = "bg-rose-50 text-rose-600 border-rose-100";
                  } else if (passes) {
                    statusLabel = "PASSED";
                    statusStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  } else {
                    statusLabel = "FAILED";
                    statusStyle = "bg-rose-50 text-rose-700 border-rose-100";
                  }
                  
                  // Row Color Cues
                  let rowColor = "hover:bg-slate-50/30";
                  if (statusLabel === "PASSED") {
                    rowColor = "bg-emerald-50/30 hover:bg-emerald-50/50";
                  } else if (statusLabel === "FAILED" || statusLabel === "MISSED") {
                    rowColor = "bg-rose-50/30 hover:bg-rose-50/50";
                  } else if (statusLabel === "PENDING") {
                    rowColor = "bg-amber-50/10 hover:bg-amber-50/30";
                  }

                  return (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={exam.id} 
                      className={`transition-colors ${rowColor}`}
                    >
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-slate-800 text-sm block">{exam.name}</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted font-bold mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>{exam.exam_date}</span>
                          <span className="mx-1">•</span>
                          <span>{exam.exam_type.replace("_", " ")}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-700">
                        {exam.batches?.name} <span className="text-[10px] text-muted block">({exam.batches?.code})</span>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className="font-extrabold block text-slate-800">T: {total}</span>
                        <span className="text-[10px] text-muted font-bold block mt-0.5">P: {pass}</span>
                      </td>

                      <td className="py-4 px-6 text-center">
                        {statusLabel === "PASSED" || statusLabel === "FAILED" ? (
                          <div className="inline-block text-center">
                            <span className={`font-extrabold block text-sm ${passes ? "text-emerald-700" : "text-rose-700"}`}>
                              {marks} / {total}
                            </span>
                            <span className="text-[9px] text-muted font-bold block">
                              {((marks / total) * 100).toFixed(0)}%
                            </span>
                          </div>
                        ) : statusLabel === "MISSED" ? (
                          <span className="text-rose-700 font-extrabold bg-rose-50 px-2 py-1 border border-rose-100 rounded">ABSENT</span>
                        ) : (
                          <span className="text-muted/50">-</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center font-display font-black text-slate-800 text-sm">
                        {statusLabel === "PASSED" || statusLabel === "FAILED" ? result.grade || "-" : statusLabel === "MISSED" ? "F" : "-"}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${statusStyle}`}>
                          {statusLabel}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {isPublished ? (
                          <Link
                            href={`/student/batches/${exam.batch_id}/exams/${exam.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-border hover:bg-primary hover:text-white hover:border-primary text-primary text-[10px] font-bold rounded-lg transition-all shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Details</span>
                          </Link>
                        ) : (
                          <span className="text-[10px] text-muted font-normal italic">Pending...</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Award className="h-10 w-10 text-muted/50 stroke-1 mb-3" />
            <h4 className="text-sm font-bold text-primary">No exams found</h4>
            <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
              No exams match your current filters.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
