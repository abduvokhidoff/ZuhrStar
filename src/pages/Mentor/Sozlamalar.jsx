import React, { useState } from "react";

const humanDate = (d) => {
  try {
    if (!d) return "-";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return d || "-";
  }
};

const safe = (v, f = "-") => (v === null || v === undefined || v === "" ? f : v);

const Avatar = ({ src, alt, size = 56 }) => (
  <div
    className="rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-200"
    style={{ width: size, height: size }}
  >
    {src ? (
      <img src={src} alt={alt || "avatar"} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
    )}
  </div>
);

const Tabs = ({ items, active, onChange }) => (
  <div className="flex gap-2 mb-4">
    {items.map((t) => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition
        ${active === t.key ? "bg-blue-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const KV = ({ label, value }) => (
  <div className="py-1">
    <div className="text-slate-500 text-xs mb-0.5">{label}</div>
    <div className="text-slate-800 text-xs font-medium">
      {safe(value)}
    </div>
  </div>
);

const Chip = ({ tone = "default", children }) => {
  const tones = {
    default: "bg-slate-100 text-slate-700",
    low: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-rose-100 text-rose-700",
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-rose-100 text-rose-700",
  };
  return <span className={`px-2 py-1 rounded text-xs font-medium ${tones[tone] || tones.default}`}>{children}</span>;
};

const Sozlamalar = () => {
  const [tab, setTab] = useState("projects");

  // Mock user data matching the images
  const me = {
    id: 1,
    full_name: "Evan Yates",
    role: "UI/UX Designer",
    position: "UI/UX Designer",
    company: "Cadstra",
    location: "NYC, New York, USA",
    birth_date: "1996-05-19",
    email: "evanyates@gmail.com",
    phone: "+1 675 346 23-10",
    skype: "Evan 2256",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    vacation_days: 12,
    sick_days: 6,
    remote_days: 42,
    projects: [
      {
        id: 1,
        code: "PN001269",
        name: "Medical App (IOS native)",
        created_at: "2020-09-12",
        tasks_total: 34,
        tasks_active: 13,
        priority: "medium",
        assignees: [
          { id: 1, name: "User 1", image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face" },
          { id: 2, name: "User 2", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face" },
          { id: 3, name: "User 3", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face" },
          { id: 4, name: "User 4", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face" }
        ]
      },
      {
        id: 2,
        code: "PN001253",
        name: "Food Delivery Service",
        created_at: "2020-09-10",
        tasks_total: 50,
        tasks_active: 24,
        priority: "medium",
        assignees: [
          { id: 1, name: "User 1", image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face" },
          { id: 2, name: "User 2", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face" },
          { id: 3, name: "User 3", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face" }
        ]
      },
      {
        id: 3,
        code: "PN001250",
        name: "Internal Project",
        created_at: "2020-05-28",
        tasks_total: 23,
        tasks_active: 20,
        priority: "low",
        assignees: [
          { id: 1, name: "User 1", image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face" },
          { id: 2, name: "User 2", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face" },
          { id: 3, name: "User 3", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face" },
          { id: 4, name: "User 4", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face" }
        ]
      }
    ]
  };

  const team = [
    {
      id: 2,
      full_name: "Shawn Stone",
      role: "UI/UX Designer",
      level: "Middle",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face"
    },
    {
      id: 3,
      full_name: "Randy Delgado",
      role: "UI/UX Designer",
      level: "Junior",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face"
    },
    {
      id: 4,
      full_name: "Emily Tyler",
      role: "Copywriter",
      level: "Middle",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face"
    },
    {
      id: 5,
      full_name: "Blake Silva",
      role: "iOS Developer",
      level: "Senior",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face"
    },
    {
      id: 6,
      full_name: "Oscar Holloway",
      role: "UI/UX Designer",
      level: "Middle",
      image: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=80&h=80&fit=crop&crop=face"
    },
    {
      id: 7,
      full_name: "Wayne Marsh",
      role: "Copywriter",
      level: "Junior",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face"
    },
    {
      id: 8,
      full_name: "Jeremy Barrett",
      role: "UI/UX Designer",
      level: "Middle",
      image: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=80&h=80&fit=crop&crop=face"
    }
  ];

  const vacationRequests = [
    {
      id: 1,
      type: "Sick Leave",
      duration: 3,
      start_date: "2020-09-13",
      end_date: "2020-09-16",
      status: "pending"
    },
    {
      id: 2,
      type: "Work remotely",
      duration: 1,
      start_date: "2020-09-01",
      end_date: "2020-09-02",
      status: "approved"
    },
    {
      id: 3,
      type: "Vacation",
      duration: 1,
      start_date: "2020-09-01",
      end_date: "2020-09-02",
      status: "approved"
    }
  ];

  const tabs = [
    { key: "projects", label: "Projects" },
    { key: "team", label: "Team" },
    { key: "vacations", label: "My vacations" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <button className="p-2 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Main Layout - Flex Side by Side */}
        <div className="flex gap-6">
          {/* Left Sidebar - Profile Info */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl p-6">
              {/* Profile Avatar and Basic Info */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <Avatar src={me?.image} alt={me?.full_name} size={80} />
                  <button className="absolute -top-1 -right-1 p-1 bg-white rounded-full shadow-sm border border-slate-200 text-slate-400 hover:text-slate-600">
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mt-3">{safe(me?.full_name)}</h3>
                <p className="text-slate-500 text-sm">{safe(me?.role)}</p>
              </div>

              {/* Main Info Section */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">Main info</h4>
                <div className="space-y-3">
                  <KV label="Position" value={me?.position} />
                  <KV label="Company" value={me?.company} />
                  <KV label="Location" value={me?.location} />
                  <KV label="Birthday Date" value={humanDate(me?.birth_date)} />
                </div>
              </div>

              {/* Contact Info Section */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">Contact Info</h4>
                <div className="space-y-3">
                  <KV label="Email" value={me?.email} />
                  <KV label="Mobile Number" value={me?.phone} />
                  <KV label="Skype" value={me?.skype} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1">
            {/* Tabs and Filter */}
            <div className="flex items-center justify-between mb-6">
              <Tabs items={tabs} active={tab} onChange={setTab} />
              {tab === "projects" && (
                <div className="flex items-center gap-3">
                  <button className="p-2 text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <select className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
                    <option>Current Projects</option>
                  </select>
                </div>
              )}
              {tab === "vacations" && (
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Request
                </button>
              )}
            </div>

            {/* Projects Tab */}
            {tab === "projects" && (
              <div className="space-y-4">
                {me.projects.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-lg flex-shrink-0 ${p.id === 1 ? 'bg-gradient-to-br from-pink-400 to-purple-500' :
                            p.id === 2 ? 'bg-gradient-to-br from-orange-400 to-red-500' :
                              'bg-gradient-to-br from-blue-400 to-indigo-500'
                            }`}
                        />
                        <div>
                          <div className="text-sm text-slate-500 mb-1">{p.code}</div>
                          <h3 className="font-semibold text-slate-900 text-lg mb-2">{p.name}</h3>
                          <div className="text-sm text-slate-500 flex items-center gap-1 mb-3">
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            Created {humanDate(p.created_at)}
                          </div>
                          {p.priority && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <Chip tone={p.priority}>{p.priority.charAt(0).toUpperCase() + p.priority.slice(1)}</Chip>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900 mb-3">Project Data</div>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between gap-8">
                            <span className="text-sm text-slate-500">All tasks</span>
                            <span className="text-sm font-semibold text-slate-900">{p.tasks_total}</span>
                          </div>
                          <div className="flex items-center justify-between gap-8">
                            <span className="text-sm text-slate-500">Active tasks</span>
                            <span className="text-sm font-semibold text-slate-900">{p.tasks_active}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-slate-500">Assignees</span>
                          <div className="flex -space-x-1">
                            {p.assignees.slice(0, 4).map((user, idx) => (
                              <Avatar key={idx} src={user.image} alt={user.name} size={24} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Team Tab */}
            {tab === "team" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.map((member) => (
                  <div key={member.id} className="bg-white rounded-xl p-6 text-center">
                    <Avatar src={member.image} alt={member.full_name} size={64} />
                    <h3 className="font-semibold text-slate-900 mt-4">{member.full_name}</h3>
                    <p className="text-sm text-slate-500 mb-3">{member.role}</p>
                    {member.level && (
                      <Chip>{member.level}</Chip>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Vacations Tab */}
            {tab === "vacations" && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-blue-500 mb-2">{me.vacation_days}</div>
                    <div className="text-sm font-medium text-slate-900 mb-1">Vacation</div>
                    <div className="text-xs text-slate-400">12/15 days available</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-red-500 mb-2">{me.sick_days}</div>
                    <div className="text-sm font-medium text-slate-900 mb-1">Sick Leave</div>
                    <div className="text-xs text-slate-400">6/12 days available</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-purple-500 mb-2">{me.remote_days}</div>
                    <div className="text-sm font-medium text-slate-900 mb-1">Work remotely</div>
                    <div className="text-xs text-slate-400">42/50 days available</div>
                  </div>
                </div>

                {/* Requests Table */}
                <div className="bg-white rounded-xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">My Requests</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-sm text-slate-500 border-b border-slate-100">
                          <th className="text-left py-3">Request Type</th>
                          <th className="text-left py-3">Duration</th>
                          <th className="text-left py-3">Start Day</th>
                          <th className="text-left py-3">End Day</th>
                          <th className="text-left py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vacationRequests.map((req) => (
                          <tr key={req.id} className="border-b border-slate-50">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <span className={`w-3 h-3 rounded-full ${req.type === 'Sick Leave' ? 'bg-red-500' :
                                  req.type === 'Work remotely' ? 'bg-purple-500' : 'bg-blue-500'
                                  }`} />
                                <span className="text-sm font-medium text-slate-900">{req.type}</span>
                              </div>
                            </td>
                            <td className="py-4 text-sm text-slate-600">{req.duration} days</td>
                            <td className="py-4 text-sm text-slate-600">{humanDate(req.start_date)}</td>
                            <td className="py-4 text-sm text-slate-600">{humanDate(req.end_date)}</td>
                            <td className="py-4">
                              <Chip tone={req.status}>{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</Chip>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sozlamalar;