import { useState } from "react";
import {
  useGetDashboardStatsQuery,
  useGetGradeDistributionQuery,
  useGetRegionStatsQuery,
  useGetPracticeDistributionQuery,
  useGetPMCapacityReportQuery,
  useGetPMCapacityHeatmapQuery,
} from "../services/pmApi";
import { useAuth } from "../context/AuthContext";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  UserCheck,
  AlertTriangle,
  Activity,
  Globe,
  Award,
  Zap,
  Layers,
  Target,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const BRAND_COLORS = [
  "#12ABDB",
  "#0070AD",
  "#001F5F",
  "#4FC3F7",
  "#64748B",
  "#94A3B8",
  "#38BDF8",
  "#0EA5E9",
];
const STATUS_COLORS: Record<string, string> = {
  Low: "#22C55E",
  Medium: "#F59E0B",
  High: "#F97316",
  Critical: "#EF4444",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}:{" "}
          <span className="text-gray-800">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

const KPICard = ({ icon: Icon, title, value, sub, color }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-2 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-2">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <span className="text-sm font-medium text-gray-500">{title}</span>
    </div>
    <p className="text-3xl font-bold text-gray-800">{value}</p>
    {sub && <p className="text-xs text-gray-400">{sub}</p>}
  </div>
);

const Section = ({ title, children, collapsible = false }: any) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div
        className={`flex items-center justify-between mb-4 ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={() => collapsible && setOpen((o) => !o)}
      >
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        {collapsible &&
          (open ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          ))}
      </div>
      {open && children}
    </div>
  );
};

const EmptyChart = ({
  message = "No data available yet — will populate as the system is used",
}: {
  message?: string;
}) => (
  <div className="flex flex-col items-center justify-center h-52 text-gray-400 gap-2">
    <BarChart2 size={32} className="opacity-30" />
    <p className="text-sm text-center max-w-xs">{message}</p>
  </div>
);

const CapacityBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    Low: "bg-green-100 text-green-700",
    Medium: "bg-yellow-100 text-yellow-700",
    High: "bg-orange-100 text-orange-700",
    Critical: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
};

export default function Analytics() {
  const { user, selectedDepartment } = useAuth();
  const isSuperAdmin = user?.role === "Super Admin";
  const deptParams =
    isSuperAdmin && selectedDepartment
      ? { department_id: selectedDepartment }
      : undefined;

  const { data: dashStats, isLoading: dashLoading } =
    useGetDashboardStatsQuery(deptParams);
  const { data: grades, isLoading: gradesLoading } =
    useGetGradeDistributionQuery(deptParams);
  const { data: regions, isLoading: regionsLoading } =
    useGetRegionStatsQuery(deptParams);
  const { data: practices, isLoading: practicesLoading } =
    useGetPracticeDistributionQuery(deptParams);
  const { data: pmCapacity, isLoading: pmCapLoading } =
    useGetPMCapacityReportQuery(deptParams);
  const { data: capacityHeatmap } = useGetPMCapacityHeatmapQuery(deptParams);

  if (
    dashLoading ||
    gradesLoading ||
    regionsLoading ||
    practicesLoading ||
    pmCapLoading
  ) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: "#12ABDB", borderTopColor: "transparent" }}
          />
          <p className="text-sm text-gray-500">Loading analytics…</p>
        </div>
      </div>
    );
  }

  const totalEmployees = dashStats?.totalEmployees || 0;
  const totalPMs = dashStats?.totalPMs || 0;
  const newJoiners = dashStats?.newJoinersWithoutPM || 0;
  const pendingAssignments = dashStats?.pendingAssignments || 0;
  const avgReporteeCount = pmCapacity?.length
    ? (
        pmCapacity.reduce(
          (s: number, p: any) => s + Number(p.reportee_count || 0),
          0,
        ) / pmCapacity.length
      ).toFixed(1)
    : "0";
  const overloadedPMs = (pmCapacity || []).filter(
    (p: any) => Number(p.utilization) >= 90,
  ).length;

  const practiceChartData = (practices || []).map((p: any) => ({
    name: p.practice || "Unknown",
    employees: Number(p.employee_count || 0),
    pms: Number(p.pm_count || 0),
  }));

  const regionChartData = (regions || []).map((r: any) => ({
    name: r.region || "Unknown",
    employees: Number(r.employee_count || 0),
    withoutPM: Number(r.without_pm || 0),
  }));

  const gradeChartData = (grades || []).map((g: any) => ({
    name: g.grade || "Unknown",
    count: Number(g.count || 0),
  }));

  const utilizationBuckets = [
    { name: "0–25%", count: 0, fill: "#22C55E" },
    { name: "26–50%", count: 0, fill: "#84CC16" },
    { name: "51–75%", count: 0, fill: "#F59E0B" },
    { name: "76–90%", count: 0, fill: "#F97316" },
    { name: ">90%", count: 0, fill: "#EF4444" },
  ];
  (pmCapacity || []).forEach((pm: any) => {
    const u = Number(pm.utilization || 0);
    if (u <= 25) utilizationBuckets[0].count++;
    else if (u <= 50) utilizationBuckets[1].count++;
    else if (u <= 75) utilizationBuckets[2].count++;
    else if (u <= 90) utilizationBuckets[3].count++;
    else utilizationBuckets[4].count++;
  });

  const heatmapSource =
    capacityHeatmap && capacityHeatmap.length > 0
      ? capacityHeatmap
      : pmCapacity || [];
  const heatmapData = heatmapSource.slice(0, 15).map((pm: any) => {
    const u = Number(pm.utilization_percent || pm.utilization || 0);
    const status =
      pm.capacity_status ||
      (u < 50 ? "Low" : u < 75 ? "Medium" : u < 90 ? "High" : "Critical");
    return {
      name: pm.name,
      practice: pm.practice,
      region: pm.region || pm.cu || "—",
      count: Number(pm.reportee_count || 0),
      utilization: u,
      status,
    };
  });

  const pmEmployeePie = [
    { name: "With PM", value: totalEmployees - newJoiners },
    { name: "Without PM", value: newJoiners },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          title="Total Employees"
          value={totalEmployees.toLocaleString()}
          sub="Active in system"
          color="#12ABDB"
        />
        <KPICard
          icon={UserCheck}
          title="People Managers"
          value={totalPMs.toLocaleString()}
          sub={`Avg ${avgReporteeCount} reportees each`}
          color="#0070AD"
        />
        <KPICard
          icon={AlertTriangle}
          title="Unassigned Joiners"
          value={newJoiners.toLocaleString()}
          sub="Need PM assignment"
          color="#F59E0B"
        />
        <KPICard
          icon={Zap}
          title="Overloaded PMs"
          value={overloadedPMs.toLocaleString()}
          sub="At ≥90% utilization"
          color="#EF4444"
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Activity}
          title="Pending Assignments"
          value={pendingAssignments.toLocaleString()}
          sub="Awaiting processing"
          color="#8B5CF6"
        />
        <KPICard
          icon={Layers}
          title="Active Practices"
          value={practiceChartData.length}
          sub="Distinct practices"
          color="#06B6D4"
        />
        <KPICard
          icon={Globe}
          title="Regions Covered"
          value={regionChartData.length}
          sub="Distinct regions"
          color="#10B981"
        />
        <KPICard
          icon={Target}
          title="PM Coverage"
          value={
            totalEmployees > 0
              ? `${(((totalEmployees - newJoiners) / totalEmployees) * 100).toFixed(1)}%`
              : "0%"
          }
          sub="Employees with PM"
          color="#12ABDB"
        />
      </div>

      {/* Grade Distribution */}
      <Section title="📊 Grade Distribution — Employees by Grade">
        {gradeChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={gradeChartData}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]}>
                {gradeChartData.map((_: any, i: number) => (
                  <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </Section>

      {/* Practice + PM Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="🏢 Practice Distribution">
          {practiceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={practiceChartData}
                margin={{ top: 5, right: 20, bottom: 25, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="employees"
                  name="Employees"
                  fill="#12ABDB"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="pms"
                  name="PMs"
                  fill="#001F5F"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Section>

        <Section title="✅ PM Coverage Overview">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={240}>
              <PieChart>
                <Pie
                  data={pmEmployeePie}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  dataKey="value"
                  label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  <Cell fill="#12ABDB" />
                  <Cell fill="#FCA5A5" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#12ABDB]" />
                <span className="text-gray-600">With PM</span>
                <span className="font-bold text-gray-800 ml-2">
                  {(totalEmployees - newJoiners).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-300" />
                <span className="text-gray-600">Without PM</span>
                <span className="font-bold text-gray-800 ml-2">
                  {newJoiners.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-gray-400 text-xs">Total Active</p>
                <p className="font-bold text-2xl text-gray-800">
                  {totalEmployees.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Region Distribution */}
      <Section title="🌍 Geographic Distribution — Employees by Region">
        {regionChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={regionChartData}
              margin={{ top: 5, right: 20, bottom: 25, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748B", fontSize: 11 }}
                angle={-20}
                textAnchor="end"
              />
              <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="employees"
                name="Total Employees"
                fill="#12ABDB"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="withoutPM"
                name="Without PM"
                fill="#FCA5A5"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </Section>

      {/* PM Utilization Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Section title="⚡ PM Utilization Distribution">
          {pmCapacity && pmCapacity.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={utilizationBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748B", fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="PMs" radius={[6, 6, 0, 0]}>
                  {utilizationBuckets.map((b, i) => (
                    <Cell key={i} fill={b.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Section>
      </div>

      {/* PM Capacity Heatmap */}
      <Section
        title="🔥 PM Capacity Heatmap — Top 15 by Utilization"
        collapsible
      >
        {heatmapData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 pr-4">PM Name</th>
                  <th className="pb-2 pr-4">Practice</th>
                  <th className="pb-2 pr-4">Region / CU</th>
                  <th className="pb-2 pr-4">Reportees</th>
                  <th className="pb-2 pr-4">Utilization</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((pm: any, i: number) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2 pr-4 font-medium text-gray-800">
                      {pm.name}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{pm.practice}</td>
                    <td className="py-2 pr-4 text-gray-600">{pm.region}</td>
                    <td className="py-2 pr-4 font-semibold text-gray-700">
                      {pm.count}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(pm.utilization, 100)}%`,
                              backgroundColor:
                                STATUS_COLORS[pm.status] || "#12ABDB",
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-9">
                          {pm.utilization}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      <CapacityBadge status={pm.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyChart message="PM capacity data not available" />
        )}
      </Section>

      {/* Exception & Risk Analysis */}
      <Section title="🚨 Exception & Risk Analysis" collapsible>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="font-semibold text-red-700 text-sm">
                High-Risk PM Clusters
              </span>
            </div>
            {(pmCapacity || []).filter((p: any) => Number(p.utilization) >= 90)
              .length > 0 ? (
              <div className="space-y-1">
                {(pmCapacity || [])
                  .filter((p: any) => Number(p.utilization) >= 90)
                  .slice(0, 5)
                  .map((pm: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-700 truncate max-w-32">
                        {pm.name}
                      </span>
                      <span className="font-bold text-red-600">
                        {Number(pm.utilization).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-green-600 font-medium">
                ✓ No overloaded PMs detected
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-amber-500" />
              <span className="font-semibold text-amber-700 text-sm">
                Unassigned by Region
              </span>
            </div>
            {regionChartData.filter((r: any) => r.withoutPM > 0).length > 0 ? (
              <div className="space-y-1">
                {regionChartData
                  .filter((r: any) => r.withoutPM > 0)
                  .sort((a: any, b: any) => b.withoutPM - a.withoutPM)
                  .slice(0, 5)
                  .map((r: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-700 truncate max-w-32">
                        {r.name}
                      </span>
                      <span className="font-bold text-amber-700">
                        {r.withoutPM} unassigned
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-green-600 font-medium">
                ✓ All regions fully covered
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award size={16} className="text-blue-500" />
              <span className="font-semibold text-blue-700 text-sm">
                Top 5 Grades by Count
              </span>
            </div>
            <div className="space-y-1">
              {gradeChartData
                .sort((a: any, b: any) => b.count - a.count)
                .slice(0, 5)
                .map((g: any, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-xs"
                  >
                    <span className="text-gray-700">{g.name}</span>
                    <div className="flex items-center gap-1">
                      <div
                        className="bg-blue-200 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min((g.count / (gradeChartData[0]?.count || 1)) * 40, 40)}px`,
                        }}
                      />
                      <span className="font-bold text-blue-700 w-12 text-right">
                        {g.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Practice-Level PM Alignment */}
      <Section title="🔬 Practice-Level PM Alignment" collapsible>
        {practiceChartData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 pr-6">Practice</th>
                  <th className="pb-2 pr-6">Employees</th>
                  <th className="pb-2 pr-6">Active PMs</th>
                  <th className="pb-2 pr-6">Emp / PM Ratio</th>
                  <th className="pb-2">Load Status</th>
                </tr>
              </thead>
              <tbody>
                {practiceChartData.map((p: any, i: number) => {
                  const ratio =
                    p.pms > 0 ? (p.employees / p.pms).toFixed(1) : null;
                  const label = !ratio
                    ? "No PMs"
                    : Number(ratio) > 12
                      ? "High Load"
                      : Number(ratio) > 8
                        ? "Moderate"
                        : "Healthy";
                  const color = !ratio
                    ? "text-red-600 bg-red-50"
                    : Number(ratio) > 12
                      ? "text-orange-600 bg-orange-50"
                      : Number(ratio) > 8
                        ? "text-yellow-600 bg-yellow-50"
                        : "text-green-600 bg-green-50";
                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2 pr-6 font-medium text-gray-800">
                        {p.name}
                      </td>
                      <td className="py-2 pr-6 text-gray-700">
                        {p.employees.toLocaleString()}
                      </td>
                      <td className="py-2 pr-6 text-gray-700">{p.pms}</td>
                      <td className="py-2 pr-6 font-semibold text-gray-800">
                        {ratio || "—"}
                      </td>
                      <td className="py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}
                        >
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyChart />
        )}
      </Section>
    </div>
  );
}
