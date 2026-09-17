"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function DailyChart({ data }: { data: { day: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-chrome-muted">Todavia no hay actividad registrada.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e7e9ee" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#e7e9ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#23262e" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8b8f98" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#8b8f98" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "#14161b", border: "1px solid #23262e", borderRadius: 8, fontSize: 12 }}
          />
          <Area type="monotone" dataKey="count" stroke="#e7e9ee" fill="url(#fillCount)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
