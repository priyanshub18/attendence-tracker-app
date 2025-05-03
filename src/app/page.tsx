"use client";
import { useState, useEffect } from "react";
import { Calendar, PlusCircle, Trash2, CheckCircle, XCircle, Settings, Save, ChevronRight, BarChart2, AlertTriangle, Award, Clock, RotateCcw, ArrowUp, ArrowDown } from "lucide-react";

// Define types
interface AttendanceRecord {
  date: string;
  status: "attended" | "missed";
}

interface Subject {
  id: number;
  name: string;
  attended: number;
  total: number;
  targetPercentage: number;
  history: AttendanceRecord[];
}

interface WeekData {
  [key: string]: {
    attended: number;
    missed: number;
    total: number;
  };
}

interface Notification {
  message: string;
  type: "success" | "error" | "warning" | "info";
}

interface NewSubject {
  name: string;
  targetPercentage: number;
}

export default function AttendanceTracker() {
  // States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState<NewSubject>({ name: "", targetPercentage: 75 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [statsType, setStatsType] = useState("weekly");
  const [showConfirmDelete, setShowConfirmDelete] = useState<number | null>(null);

  // Load data from localStorage
  useEffect(() => {
    setIsLoading(true);
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);

    const savedSubjects = localStorage.getItem("attendanceTrackerSubjects");
    if (savedSubjects) {
      try {
        const parsedSubjects = JSON.parse(savedSubjects) as Subject[];
        setSubjects(parsedSubjects);
      } catch (e) {
        console.error("Failed to parse saved subjects:", e);
        setSubjects([
          { id: 1, name: "Mathematics", attended: 8, total: 10, targetPercentage: 75, history: generateDummyHistory() },
          { id: 2, name: "Physics", attended: 12, total: 15, targetPercentage: 80, history: generateDummyHistory() },
          { id: 3, name: "Computer Science", attended: 14, total: 18, targetPercentage: 85, history: generateDummyHistory() },
        ]);
      }
    } else {
      // Default subjects
      setSubjects([
        { id: 1, name: "Mathematics", attended: 8, total: 10, targetPercentage: 75, history: generateDummyHistory() },
        { id: 2, name: "Physics", attended: 12, total: 15, targetPercentage: 80, history: generateDummyHistory() },
        { id: 3, name: "Computer Science", attended: 14, total: 18, targetPercentage: 85, history: generateDummyHistory() },
      ]);
    }

    setTimeout(() => setIsLoading(false), 600); // Simulate loading for animation
  }, []);

  // Save data to localStorage whenever subjects change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("attendanceTrackerSubjects", JSON.stringify(subjects));
    }
  }, [subjects, isLoading]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  // Generate dummy history data for demonstration
  function generateDummyHistory(): AttendanceRecord[] {
    const history: AttendanceRecord[] = [];
    const now = new Date();

    // Generate 14 days of data
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Randomly decide if attended (biased towards attending)
      const status = Math.random() > 0.3 ? "attended" as const : "missed" as const;

      history.push({
        date: date.toISOString().split("T")[0], // YYYY-MM-DD format
        status,
      });
    }

    return history;
  }

  const calculateSkippable = (attended: number, total: number, targetPercentage: number): number => {
    if (total === 0) return 0;

    const targetAttendance = targetPercentage / 100;

    // If targetAttendance is 100%, you can't miss any classes
    if (targetAttendance === 1) return 0;

    // Calculate maximum total classes possible while maintaining target percentage
    const maxTotal = Math.floor(attended / targetAttendance);

    // Skippable classes = maximum possible total - current total
    const skippable = maxTotal - total;

    return Math.max(0, skippable);
  };

  const handleAddSubject = () => {
    if (newSubject.name.trim() === "") {
      showNotification("Please enter a subject name", "error");
      return;
    }

    const newId = subjects.length > 0 ? Math.max(...subjects.map((s) => s.id)) + 1 : 1;

    const newSubjectData: Subject = {
      id: newId,
      name: newSubject.name,
      attended: 0,
      total: 0,
      targetPercentage: Number(newSubject.targetPercentage) || 75,
      history: [],
    };

    setSubjects([...subjects, newSubjectData]);
    setNewSubject({ name: "", targetPercentage: 75 });
    setShowAddForm(false);
    showNotification(`Subject "${newSubject.name}" added successfully!`, "success");
  };

  const handleDeleteSubject = (id: number) => {
    if (showConfirmDelete === id) {
      setSubjects(subjects.filter((subject) => subject.id !== id));
      setShowConfirmDelete(null);
      showNotification("Subject deleted successfully", "success");
    } else {
      setShowConfirmDelete(id);
    }
  };

  const recordAttendance = (subjectId: number, status: "attended" | "missed") => {
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD format

    setSubjects(
      subjects.map((subject) => {
        if (subject.id === subjectId) {
          // Add to history
          const updatedHistory = [
            ...(subject.history || []),
            {
              date: today,
              status,
            },
          ];

          return {
            ...subject,
            attended: status === "attended" ? subject.attended + 1 : subject.attended,
            total: subject.total + 1,
            history: updatedHistory,
          };
        }
        return subject;
      })
    );

    showNotification(`Marked as ${status} for ${subjects.find((s) => s.id === subjectId)?.name}`, status === "attended" ? "success" : "warning");
  };

  const handleUpdateSubject = () => {
    if (!editingSubject) return;

    if (editingSubject.name.trim() === "") {
      showNotification("Subject name cannot be empty", "error");
      return;
    }

    setSubjects(subjects.map((subject) => (subject.id === editingSubject.id ? editingSubject : subject)));

    setEditingSubject(null);
    showNotification("Subject updated successfully!", "success");
  };

  const handleUndoLastAttendance = (subjectId: number) => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject || !subject.history || subject.history.length === 0 || subject.total === 0) {
      showNotification("No attendance records to undo", "error");
      return;
    }

    // Remove the last history entry
    const updatedHistory = [...subject.history];
    const lastRecord = updatedHistory.pop();

    setSubjects(
      subjects.map((s) => {
        if (s.id === subjectId) {
          return {
            ...s,
            attended: lastRecord?.status === "attended" ? s.attended - 1 : s.attended,
            total: s.total - 1,
            history: updatedHistory,
          };
        }
        return s;
      })
    );

    showNotification("Last attendance record undone", "success");
  };

  const getAttendanceStatus = (attended: number, total: number, targetPercentage: number): "good" | "warning" | "danger" => {
    const currentPercentage = total === 0 ? 100 : (attended / total) * 100;

    if (currentPercentage >= targetPercentage) {
      return "good";
    } else if (currentPercentage >= targetPercentage - 10) {
      return "warning";
    } else {
      return "danger";
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const showNotification = (message: string, type: Notification["type"] = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedSubjects = [...subjects].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "percentage":
        const aPercentage = a.total === 0 ? 100 : (a.attended / a.total) * 100;
        const bPercentage = b.total === 0 ? 100 : (b.attended / b.total) * 100;
        comparison = aPercentage - bPercentage;
        break;
      case "status":
        const aStatus = getAttendanceStatus(a.attended, a.total, a.targetPercentage);
        const bStatus = getAttendanceStatus(b.attended, b.total, b.targetPercentage);
        comparison = aStatus.localeCompare(bStatus);
        break;
      default:
        comparison = 0;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Get week-based attendance data for the chart
  const getWeeklyAttendanceData = (history: AttendanceRecord[]) => {
    if (!history || history.length === 0) return [];

    // Group by week and count attended vs missed
    const weekData: WeekData = {};

    history.forEach((record) => {
      const date = new Date(record.date);
      const weekStart = new Date(date);
      const day = date.getDay() || 7; // Make Sunday 7 instead of 0
      weekStart.setDate(date.getDate() - day + 1); // Set to Monday

      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weekData[weekKey]) {
        weekData[weekKey] = { attended: 0, missed: 0, total: 0 };
      }

      weekData[weekKey][record.status === "attended" ? "attended" : "missed"]++;
      weekData[weekKey].total++;
    });

    // Convert to array suitable for charts
    return Object.keys(weekData).map((weekKey) => {
      const data = weekData[weekKey];
      const percentage = data.total > 0 ? (data.attended / data.total) * 100 : 0;

      return {
        week: weekKey.substring(5), // Remove year part
        attended: data.attended,
        missed: data.missed,
        percentage: percentage,
      };
    });
  };

  // Get attendance data for specific timeframes
  const getAttendanceData = (subject: Subject) => {
    if (!subject || !subject.history) return [];

    switch (statsType) {
      case "weekly":
        return getWeeklyAttendanceData(subject.history);
      default:
        return getWeeklyAttendanceData(subject.history);
    }
  };

  // Render mini chart with attendance pattern
  const renderMiniChart = (subject: Subject) => {
    if (!subject.history || subject.history.length === 0) return null;

    // Get last 5 entries
    const recentHistory = [...subject.history].slice(-5);

    return (
      <div className='flex items-center space-x-1 mt-1'>
        {recentHistory.map((record, index) => (
          <div key={index} className={`w-2 h-6 rounded-sm ${record.status === "attended" ? "bg-green-500 opacity-80" : "bg-red-500 opacity-70"}`} style={{ height: record.status === "attended" ? "24px" : "12px" }}></div>
        ))}
      </div>
    );
  };

  // Calculate trend (improving, declining, steady)
  const calculateTrend = (subject: Subject): "improving" | "declining" | "steady" => {
    if (!subject.history || subject.history.length < 4) return "steady";

    const recentHistory = [...subject.history].slice(-4);
    const attendedCount = recentHistory.filter((r) => r.status === "attended").length;

    if (attendedCount >= 3) return "improving";
    if (attendedCount <= 1) return "declining";
    return "steady";
  };

  // Progress bar component
  const ProgressBar = ({ current, target, status }: { current: number; target: number; status: "good" | "warning" | "danger" }) => {
    const percentage = Math.min(100, current);
    const width = `${percentage}%`;

    let barColor = "bg-blue-500";
    if (status === "good") barColor = "bg-green-500";
    else if (status === "warning") barColor = "bg-yellow-500";
    else if (status === "danger") barColor = "bg-red-500";

    return (
      <div className={`h-2 w-full rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-200"} overflow-hidden mt-2`}>
        <div className={`h-full ${barColor} transition-all duration-500 ease-out`} style={{ width }}></div>
        {target < 100 && <div className='h-full w-px bg-white absolute' style={{ left: `${target}%`, top: 0 }}></div>}
      </div>
    );
  };

  // Rendering UI components
  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-800"} transition-colors duration-300`}>
      {/* Loading screen */}
      {isLoading && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg flex items-center space-x-3`}>
            <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500'></div>
            <span>Loading your attendance data...</span>
          </div>
        </div>
      )}

      {/* Notification toast */}
      {notification && (
        <div className={`fixed top-4 right-4 p-3 rounded-lg shadow-lg z-40 transition-all duration-300 transform ${notification ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"} ${notification?.type === "success" ? "bg-green-500 text-white" : notification?.type === "error" ? "bg-red-500 text-white" : notification?.type === "warning" ? "bg-yellow-500 text-white" : "bg-blue-500 text-white"}`}>
          <p>{notification.message}</p>
        </div>
      )}

      <div className='max-w-4xl mx-auto p-4'>
        {/* Header */}
        <header className='flex justify-between items-center mb-8 py-2'>
          <div className='flex items-center'>
            <div className={`p-2 rounded-full mr-3 ${darkMode ? "bg-purple-900" : "bg-purple-100"}`}>
              <Calendar className={`${darkMode ? "text-purple-300" : "text-purple-600"}`} size={24} />
            </div>
            <h1 className='text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text'>Attendance Tracker</h1>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${darkMode ? "bg-gray-800 text-yellow-300" : "bg-gray-200 text-indigo-700"}`}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </header>

        {/* Navigation Tabs */}
        <div className='flex mb-6 border-b overflow-x-auto py-1'>
          <button onClick={() => setActiveTab("dashboard")} className={`px-4 py-2 font-medium transition-all duration-300 relative ${activeTab === "dashboard" ? `${darkMode ? "text-purple-400" : "text-purple-600"}` : `${darkMode ? "text-gray-400" : "text-gray-600"}`}`}>
            Dashboard
            {activeTab === "dashboard" && <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 transform scale-x-100 transition-transform duration-300`}></span>}
          </button>
          <button onClick={() => setActiveTab("manage")} className={`px-4 py-2 font-medium transition-all duration-300 relative ${activeTab === "manage" ? `${darkMode ? "text-purple-400" : "text-purple-600"}` : `${darkMode ? "text-gray-400" : "text-gray-600"}`}`}>
            Manage Subjects
            {activeTab === "manage" && <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 transform scale-x-100 transition-transform duration-300`}></span>}
          </button>
          <button onClick={() => setActiveTab("stats")} className={`px-4 py-2 font-medium transition-all duration-300 relative ${activeTab === "stats" ? `${darkMode ? "text-purple-400" : "text-purple-600"}` : `${darkMode ? "text-gray-400" : "text-gray-600"}`}`}>
            Statistics
            {activeTab === "stats" && <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 transform scale-x-100 transition-transform duration-300`}></span>}
          </button>
        </div>

        {/* Main Content */}
        <div className='flex-1'>
          {activeTab === "dashboard" && (
            <div className='space-y-4'>
              {/* Sort options */}
              {subjects.length > 0 && (
                <div className={`mb-4 flex justify-between items-center p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-white shadow-sm"}`}>
                  <div className='text-sm font-medium'>Sort by:</div>
                  <div className='flex space-x-2'>
                    <button onClick={() => toggleSort("name")} className={`px-2 py-1 text-sm rounded-md flex items-center ${sortField === "name" ? `${darkMode ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"}` : `${darkMode ? "bg-gray-700" : "bg-gray-100"}`}`}>
                      Name
                      {sortField === "name" && (sortDirection === "asc" ? <ArrowUp size={14} className='ml-1' /> : <ArrowDown size={14} className='ml-1' />)}
                    </button>
                    <button onClick={() => toggleSort("percentage")} className={`px-2 py-1 text-sm rounded-md flex items-center ${sortField === "percentage" ? `${darkMode ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"}` : `${darkMode ? "bg-gray-700" : "bg-gray-100"}`}`}>
                      Percentage
                      {sortField === "percentage" && (sortDirection === "asc" ? <ArrowUp size={14} className='ml-1' /> : <ArrowDown size={14} className='ml-1' />)}
                    </button>
                    <button onClick={() => toggleSort("status")} className={`px-2 py-1 text-sm rounded-md flex items-center ${sortField === "status" ? `${darkMode ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"}` : `${darkMode ? "bg-gray-700" : "bg-gray-100"}`}`}>
                      Status
                      {sortField === "status" && (sortDirection === "asc" ? <ArrowUp size={14} className='ml-1' /> : <ArrowDown size={14} className='ml-1' />)}
                    </button>
                  </div>
                </div>
              )}

              {subjects.length === 0 ? (
                <div className={`text-center p-8 rounded-lg ${darkMode ? "bg-gray-800" : "bg-white shadow"} transition-all duration-500 transform hover:scale-[1.01]`}>
                  <div className='text-center'>
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${darkMode ? "bg-gray-700" : "bg-purple-50"}`}>
                      <Calendar className={`${darkMode ? "text-purple-400" : "text-purple-500"}`} size={32} />
                    </div>
                    <p className='mb-4'>No subjects added yet.</p>
                    <button
                      onClick={() => {
                        setActiveTab("manage");
                        setShowAddForm(true);
                      }}
                      className={`px-4 py-2 rounded-md ${darkMode ? "bg-gradient-to-r from-purple-600 to-blue-600" : "bg-gradient-to-r from-purple-500 to-blue-500"} text-white flex items-center justify-center mx-auto hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
                    >
                      <PlusCircle size={18} className='mr-2' />
                      Add Your First Subject
                    </button>
                  </div>
                </div>
              ) : (
                sortedSubjects.map((subject, index) => {
                  const currentPercentage = subject.total === 0 ? 100 : (subject.attended / subject.total) * 100;
                  const status = getAttendanceStatus(subject.attended, subject.total, subject.targetPercentage);
                  const canSkip = calculateSkippable(subject.attended, subject.total, subject.targetPercentage);
                  const isExpanded = expandedSubject === subject.id;
                  const trend = calculateTrend(subject);

                  return (
                    <div
                      key={subject.id}
                      className={`rounded-lg ${darkMode ? "bg-gray-800" : "bg-white shadow"} overflow-hidden transition-all duration-300 transform hover:scale-[1.01] ${isExpanded ? "scale-[1.01]" : ""}`}
                      style={{
                        opacity: 0,
                        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`,
                      }}
                    >
                      <div className='p-4 cursor-pointer' onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}>
                        <div className='flex justify-between items-center mb-2'>
                          <div className='flex items-center'>
                            <h3 className='text-lg font-semibold mr-2'>{subject.name}</h3>
                            {trend === "improving" && <div className='bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full dark:bg-green-900 dark:text-green-200'>Improving</div>}
                            {trend === "declining" && <div className='bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full dark:bg-red-900 dark:text-red-200'>Declining</div>}
                          </div>
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium
                            ${status === "good" ? `${darkMode ? "bg-green-900 text-green-300" : "bg-green-100 text-green-800"}` : status === "warning" ? `${darkMode ? "bg-yellow-900 text-yellow-300" : "bg-yellow-100 text-yellow-800"}` : `${darkMode ? "bg-red-900 text-red-300" : "bg-red-100 text-red-800"}`}`}
                          >
                            {formatPercentage(currentPercentage)} / {subject.targetPercentage}% Target
                          </div>
                        </div>

                        <ProgressBar current={currentPercentage} target={subject.targetPercentage} status={status} />

                        <div className='grid grid-cols-3 gap-3 mt-4'>
                          <div className={`p-3 rounded-md ${darkMode ? "bg-gray-700" : "bg-gray-50"} transition-all duration-300`}>
                            <div className='flex justify-between'>
                              <p className='text-sm text-gray-500'>Attendance</p>
                              <CheckCircle size={16} className={status === "good" ? "text-green-500" : "text-gray-400"} />
                            </div>
                            <p className='font-semibold'>
                              {subject.attended} / {subject.total} Classes
                            </p>
                          </div>
                          <div className={`p-3 rounded-md ${darkMode ? "bg-gray-700" : "bg-gray-50"} transition-all duration-300`}>
                            <div className='flex justify-between'>
                              <p className='text-sm text-gray-500'>Can Skip</p>
                              <Clock size={16} className={canSkip > 0 ? "text-blue-500" : "text-gray-400"} />
                            </div>
                            <p className='font-semibold'>
                              {canSkip} {canSkip === 1 ? "Class" : "Classes"}
                            </p>
                          </div>
                          <div className={`p-3 rounded-md ${darkMode ? "bg-gray-700" : "bg-gray-50"} transition-all duration-300`}>
                            <div className='flex justify-between'>
                              <p className='text-sm text-gray-500'>Status</p>
                              {status === "good" ? <Award size={16} className='text-green-500' /> : status === "warning" ? <AlertTriangle size={16} className='text-yellow-500' /> : <AlertTriangle size={16} className='text-red-500' />}
                            </div>
                            <p className='font-semibold capitalize'>{status}</p>
                          </div>
                        </div>

                        {renderMiniChart(subject)}

                        <div className='flex justify-between items-center mt-4'>
                          <div className='text-sm text-gray-500'>Tap to {isExpanded ? "collapse" : "expand"}</div>
                          <ChevronRight size={20} className={`transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={`p-4 ${darkMode ? "border-t border-gray-700" : "border-t border-gray-100"} animate-fadeIn`}>
                          <div className='flex space-x-3 mb-2'>
                            <button
                              onClick={() => recordAttendance(subject.id, "attended")}
                              className={`flex-1 py-3 rounded-md flex items-center justify-center
                                ${darkMode ? "bg-green-800 hover:bg-green-700 text-white" : "bg-green-100 hover:bg-green-200 text-green-800"}`}
                            >
                              <CheckCircle size={16} className='mr-1' /> Attended
                            </button>
                            <button
                              onClick={() => recordAttendance(subject.id, "missed")}
                              className={`flex-1 py-3 rounded-md flex items-center justify-center
                                ${darkMode ? "bg-red-800 hover:bg-red-700 text-white" : "bg-red-100 hover:bg-red-200 text-red-800"}`}
                            >
                              <XCircle size={16} className='mr-1' /> Missed
                            </button>
                          </div>

                          <div className='flex'>
                            <button
                              onClick={() => handleUndoLastAttendance(subject.id)}
                              className={`flex-1 py-2 rounded-md flex items-center justify-center
                                ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                            >
                              <RotateCcw size={16} className='mr-1' /> Undo Last Record
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "manage" && (
            <div className={`rounded-lg p-4 ${darkMode ? "bg-gray-800" : "bg-white shadow"}`}>
              <div className='flex justify-between items-center mb-4'>
                <h2 className='text-xl font-semibold'>Manage Subjects</h2>
                {!showAddForm && (
                  <button onClick={() => setShowAddForm(true)} className={`px-3 py-2 rounded-md ${darkMode ? "bg-gradient-to-r from-purple-600 to-blue-600" : "bg-gradient-to-r from-purple-500 to-blue-500"} text-white flex items-center hover:shadow-md transition-all duration-300`}>
                    <PlusCircle size={16} className='mr-1' /> Add Subject
                  </button>
                )}
              </div>

              {showAddForm && (
                <div className={`p-4 mb-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"} animate-fadeIn`}>
                  <h3 className='font-medium mb-3'>Add New Subject</h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Subject Name</label>
                      <input type='text' value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} className={`w-full p-2 rounded-md ${darkMode ? "bg-gray-600 border border-gray-500 text-white" : "border border-gray-300"} focus:ring-2 focus:ring-purple-500 transition-all duration-200`} placeholder='Enter subject name' />
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Target Attendance (%)</label>
                      <input 
                        type='number' 
                        min='1' 
                        max='100' 
                        value={newSubject.targetPercentage} 
                        onChange={(e) => setNewSubject({ 
                          ...newSubject, 
                          targetPercentage: Number(e.target.value) 
                        })} 
                        className={`w-full p-2 rounded-md ${darkMode ? "bg-gray-600 border border-gray-500 text-white" : "border border-gray-300"} focus:ring-2 focus:ring-purple-500 transition-all duration-200`} 
                      />
                    </div>
                  </div>
                  <div className='flex justify-end space-x-2'>
                    <button onClick={() => setShowAddForm(false)} className={`px-3 py-2 rounded-md ${darkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} transition-colors duration-200`}>
                      Cancel
                    </button>
                    <button onClick={handleAddSubject} className={`px-3 py-2 rounded-md ${darkMode ? "bg-gradient-to-r from-purple-600 to-blue-600" : "bg-gradient-to-r from-purple-500 to-blue-500"} text-white hover:shadow-md transition-all duration-300`}>
                      Add Subject
                    </button>
                  </div>
                </div>
              )}

              {editingSubject && (
                <div className={`p-4 mb-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"} animate-fadeIn`}>
                  <h3 className='font-medium mb-3'>Edit Subject</h3>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Subject Name</label>
                      <input type='text' value={editingSubject.name} onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })} className={`w-full p-2 rounded-md ${darkMode ? "bg-gray-600 border border-gray-500 text-white" : "border border-gray-300"} focus:ring-2 focus:ring-purple-500 transition-all duration-200`} />
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Attended Classes</label>
                      <input type='number' min='0' value={editingSubject.attended} onChange={(e) => setEditingSubject({ ...editingSubject, attended: parseInt(e.target.value) || 0 })} className={`w-full p-2 rounded-md ${darkMode ? "bg-gray-600 border border-gray-500 text-white" : "border border-gray-300"} focus:ring-2 focus:ring-purple-500 transition-all duration-200`} />
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Total Classes</label>
                      <input type='number' min='0' value={editingSubject.total} onChange={(e) => setEditingSubject({ ...editingSubject, total: parseInt(e.target.value) || 0 })} className={`w-full p-2 rounded-md ${darkMode ? "bg-gray-600 border border-gray-500 text-white" : "border border-gray-300"} focus:ring-2 focus:ring-purple-500 transition-all duration-200`} />
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Target Attendance (%)</label>
                      <input 
                        type='number' 
                        min='1' 
                        max='100' 
                        value={editingSubject?.targetPercentage || ''} 
                        onChange={(e) => editingSubject && setEditingSubject({ 
                          ...editingSubject, 
                          targetPercentage: Number(e.target.value) || 75 
                        })} 
                        className={`w-full p-2 rounded-md ${darkMode ? "bg-gray-600 border border-gray-500 text-white" : "border border-gray-300"} focus:ring-2 focus:ring-purple-500 transition-all duration-200`} 
                      />
                    </div>
                  </div>
                  <div className='flex justify-end space-x-2'>
                    <button onClick={() => setEditingSubject(null)} className={`px-3 py-2 rounded-md ${darkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} transition-colors duration-200`}>
                      Cancel
                    </button>
                    <button onClick={handleUpdateSubject} className={`px-3 py-2 rounded-md ${darkMode ? "bg-green-600 hover:bg-green-700" : "bg-green-600 hover:bg-green-700"} text-white flex items-center transition-all duration-300`}>
                      <Save size={16} className='mr-1' /> Save Changes
                    </button>
                  </div>
                </div>
              )}

              <div className='mt-4'>
                <h3 className='font-medium mb-3'>Your Subjects</h3>
                {subjects.length === 0 ? (
                  <div className={`text-center py-8 ${darkMode ? "bg-gray-700" : "bg-gray-50"} rounded-lg`}>
                    <p className='text-gray-500'>No subjects added yet.</p>
                    <button onClick={() => setShowAddForm(true)} className={`mt-3 px-4 py-2 rounded-md ${darkMode ? "bg-gradient-to-r from-purple-600 to-blue-600" : "bg-gradient-to-r from-purple-500 to-blue-500"} text-white hover:shadow-md transition-all duration-300`}>
                      <PlusCircle size={16} className='inline-block mr-1' /> Add Your First Subject
                    </button>
                  </div>
                ) : (
                  <div className={`rounded-md overflow-hidden ${darkMode ? "border border-gray-700" : "border border-gray-200"}`}>
                    {subjects.map((subject, index) => (
                      <div key={subject.id} className={`flex items-center justify-between p-3 ${index !== subjects.length - 1 ? `${darkMode ? "border-b border-gray-700" : "border-b border-gray-200"}` : ""} transition-colors duration-200 hover:${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <div>
                          <h4 className='font-medium'>{subject.name}</h4>
                          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Attendance: {subject.attended}/{subject.total} ({subject.total === 0 ? "100" : ((subject.attended / subject.total) * 100).toFixed(1)}%)
                          </p>
                          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Target: {subject.targetPercentage}%</p>
                        </div>
                        <div className='flex space-x-2'>
                          <button onClick={() => setEditingSubject({ ...subject })} className={`p-2 rounded-md ${darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"} transition-colors duration-200`}>
                            <Settings size={16} />
                          </button>
                          <button onClick={() => handleDeleteSubject(subject.id)} className={`p-2 rounded-md ${darkMode ? "bg-red-900 hover:bg-red-800" : "bg-red-100 hover:bg-red-200"} ${darkMode ? "text-red-300" : "text-red-600"} transition-colors duration-200`}>
                            {showConfirmDelete === subject.id ? <CheckCircle size={16} /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className={`rounded-lg p-4 ${darkMode ? "bg-gray-800" : "bg-white shadow"}`}>
              <div className='flex justify-between items-center mb-4'>
                <h2 className='text-xl font-semibold'>Attendance Statistics</h2>
                <div className='flex space-x-2'>
                  <button onClick={() => setStatsType("weekly")} className={`px-3 py-1 text-sm rounded-md ${statsType === "weekly" ? `${darkMode ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"}` : `${darkMode ? "bg-gray-700" : "bg-gray-100"}`} transition-colors duration-200`}>
                    Weekly
                  </button>
                  <button onClick={() => setStatsType("monthly")} className={`px-3 py-1 text-sm rounded-md ${statsType === "monthly" ? `${darkMode ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"}` : `${darkMode ? "bg-gray-700" : "bg-gray-100"}`} transition-colors duration-200`}>
                    Monthly
                  </button>
                </div>
              </div>

              {subjects.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? "bg-gray-700" : "bg-gray-50"} rounded-lg`}>
                  <p className='text-gray-500'>No statistics available yet. Add subjects to see statistics.</p>
                  <button
                    onClick={() => {
                      setActiveTab("manage");
                      setShowAddForm(true);
                    }}
                    className={`mt-3 px-4 py-2 rounded-md ${darkMode ? "bg-gradient-to-r from-purple-600 to-blue-600" : "bg-gradient-to-r from-purple-500 to-blue-500"} text-white hover:shadow-md transition-all duration-300`}
                  >
                    <PlusCircle size={16} className='inline-block mr-1' /> Add Your First Subject
                  </button>
                </div>
              ) : (
                <div className='space-y-6'>
                  {/* Overall Statistics */}
                  <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                    <h3 className='font-medium mb-3'>Overall Statistics</h3>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                      <div className={`p-3 rounded-md ${darkMode ? "bg-gray-600" : "bg-white"} shadow-sm`}>
                        <p className='text-sm text-gray-500'>Average Attendance</p>
                        <p className='text-xl font-bold'>{subjects.reduce((sum, subject) => sum + (subject.total > 0 ? (subject.attended / subject.total) * 100 : 100), 0) / subjects.length}%</p>
                      </div>
                      <div className={`p-3 rounded-md ${darkMode ? "bg-gray-600" : "bg-white"} shadow-sm`}>
                        <p className='text-sm text-gray-500'>Total Classes Attended</p>
                        <p className='text-xl font-bold'>
                          {subjects.reduce((sum, subject) => sum + subject.attended, 0)} / {subjects.reduce((sum, subject) => sum + subject.total, 0)}
                        </p>
                      </div>
                      <div className={`p-3 rounded-md ${darkMode ? "bg-gray-600" : "bg-white"} shadow-sm`}>
                        <p className='text-sm text-gray-500'>Subjects Meeting Target</p>
                        <p className='text-xl font-bold'>
                          {
                            subjects.filter((subject) => {
                              const percentage = subject.total === 0 ? 100 : (subject.attended / subject.total) * 100;
                              return percentage >= subject.targetPercentage;
                            }).length
                          }{" "}
                          / {subjects.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subject-specific Statistics */}
                  {subjects.map((subject) => {
                    const currentPercentage = subject.total === 0 ? 100 : (subject.attended / subject.total) * 100;
                    const status = getAttendanceStatus(subject.attended, subject.total, subject.targetPercentage);
                    const attendanceData = getAttendanceData(subject);

                    return (
                      <div key={subject.id} className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <h3 className='font-medium mb-3'>{subject.name}</h3>
                        <div className='flex items-center mb-3'>
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold mr-4 ${status === "good" ? `${darkMode ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800"}` : status === "warning" ? `${darkMode ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"}` : `${darkMode ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800"}`}`}>{Math.round(currentPercentage)}%</div>
                          <div>
                            <p className='font-medium'>Current: {formatPercentage(currentPercentage)}</p>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Target: {subject.targetPercentage}%</p>
                          </div>
                        </div>

                        {/* Attendance Chart/Visualization */}
                        <div className={`p-3 rounded-md ${darkMode ? "bg-gray-800" : "bg-white"} mb-3`}>
                          <p className='text-sm font-medium mb-2'>Recent Attendance Pattern</p>
                          <div className='flex items-end space-x-1 h-24'>
                            {attendanceData.map((data, index) => (
                              <div key={index} className='flex-1 flex flex-col items-center'>
                                <div className={`w-full transition-all duration-500 ${data.percentage >= subject.targetPercentage ? "bg-green-500" : data.percentage >= subject.targetPercentage - 10 ? "bg-yellow-500" : "bg-red-500"}`} style={{ height: `${Math.max(5, data.percentage)}%` }}></div>
                                <p className='text-xs mt-1 text-gray-500'>{data.week}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className='grid grid-cols-2 gap-3'>
                          <div className={`p-3 rounded-md ${darkMode ? "bg-gray-600" : "bg-white"} shadow-sm`}>
                            <p className='text-sm text-gray-500'>Classes This Period</p>
                            <p className='font-bold'>
                              Attended: {attendanceData.reduce((sum, data) => sum + data.attended, 0)}
                              <br />
                              Missed: {attendanceData.reduce((sum, data) => sum + data.missed, 0)}
                            </p>
                          </div>
                          <div className={`p-3 rounded-md ${darkMode ? "bg-gray-600" : "bg-white"} shadow-sm`}>
                            <p className='text-sm text-gray-500'>Needed to Reach Target</p>
                            <p className='font-bold'>
                              {(() => {
                                // Calculate how many consecutive classes to attend to reach target
                                const needed = Math.ceil((subject.targetPercentage / 100) * (subject.total + 1) - subject.attended);
                                return needed > 0 ? `${needed} classes` : "On target!";
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className='mt-12 text-center'>
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Attendance Tracker • Stay on top of your class attendance</p>
        </footer>
      </div>

      {/* Global CSS */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .dark-mode {
          background-color: #111827;
          color: #f3f4f6;
        }
      `}</style>
    </div>
  );
}
