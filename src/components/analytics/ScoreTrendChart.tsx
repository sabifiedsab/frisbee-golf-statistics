import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface TrendData {
  date: Date;
  averageScore: number;
  totalPutts: number;
  avgPuttsPerHole: number;
  birdies: number;
  pars: number;
  bogies: number;
  courseName: string;
}

interface AnalyticsChartProps {
  data: TrendData[];
}

export function ScoreTrendChart({ data }: AnalyticsChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
            formatter={(value, name) => [value, name]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="averageScore"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            name="Avg Score"
          />
          <Line
            type="monotone"
            dataKey="avgPuttsPerHole"
            stroke="#82ca9d"
            name="Avg Putts/Hole"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
