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
      const status = Math.random() > 0.3 ? ("attended" as const) : ("missed" as const);

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
          <div key={index} className={`w-2 rounded-sm ${record.status === "attended" ? "bg-green-500 opacity-80" : "bg-red-500 opacity-70"}`} style={{ height: record.status === "attended" ? "24px" : "12px" }}></div>
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
      <div className={`h-2 w-full rounded-full ${darkMode ? "bg-gray-900" : "bg-gray-200"} overflow-hidden mt-2`}>
        <div className={`h-full ${barColor} transition-all duration-500 ease-out`} style={{ width }}></div>
      </div>
    );
  };

  // Rendering UI components
  return (
    <div className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-gray-50 text-gray-800"} transition-colors duration-300`}>
      {/* Loading screen */}
      {isLoading && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50 backdrop-blur-sm'>
          <div className={`p-6 rounded-2xl ${darkMode ? "bg-gray-900 bg-opacity-80" : "bg-white"} shadow-2xl flex items-center space-x-4 backdrop-blur-md border border-gray-800 border-opacity-40`}>
            <div className='animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500'></div>
            <span className='font-medium'>Loading your attendance data...</span>
          </div>
        </div>
      )}

      {/* Notification toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-xl shadow-2xl z-40 transition-all duration-300 backdrop-blur-md 
        ${notification?.type === "success" ? "bg-green-500 bg-opacity-80 text-white" : notification?.type === "error" ? "bg-red-500 bg-opacity-80 text-white" : notification?.type === "warning" ? "bg-yellow-500 bg-opacity-80 text-white" : "bg-blue-500 bg-opacity-80 text-white"}`}
        >
          <p className='font-medium'>{notification.message}</p>
        </div>
      )}

      <div className='max-w-5xl mx-auto p-6'>
        {/* Header */}
        <header className='flex justify-between items-center mb-8 py-3'>
          <div className='flex items-center'>
            <div className={`p-3 rounded-xl mr-4 ${darkMode ? "bg-purple-900 bg-opacity-30 backdrop-blur-md" : "bg-purple-100"}`}>
              <Calendar className={`${darkMode ? "text-purple-300" : "text-purple-600"}`} size={28} />
            </div>
            <h1 className='text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text'>Attendance Tracker</h1>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-110 
            ${darkMode ? "bg-gray-900 bg-opacity-50 backdrop-blur-md text-yellow-300 border border-gray-800" : "bg-gray-200 text-indigo-700"}`}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </header>

        {/* Navigation Tabs */}
        <div className='flex mb-8 overflow-x-auto py-2'>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-3 mr-4 font-medium transition-all duration-300 rounded-xl
            ${activeTab === "dashboard" ? `${darkMode ? "bg-gray-900 bg-opacity-50 backdrop-blur-md text-purple-400 border border-purple-900 border-opacity-50" : "bg-white shadow text-purple-600"}` : `${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-800"}`}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-6 py-3 mr-4 font-medium transition-all duration-300 rounded-xl
            ${activeTab === "manage" ? `${darkMode ? "bg-gray-900 bg-opacity-50 backdrop-blur-md text-purple-400 border border-purple-900 border-opacity-50" : "bg-white shadow text-purple-600"}` : `${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-800"}`}`}
          >
            Manage Subjects
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-6 py-3 font-medium transition-all duration-300 rounded-xl
            ${activeTab === "stats" ? `${darkMode ? "bg-gray-900 bg-opacity-50 backdrop-blur-md text-purple-400 border border-purple-900 border-opacity-50" : "bg-white shadow text-purple-600"}` : `${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-800"}`}`}
          >
            Statistics
          </button>
        </div>

        {/* Main Content */}
        <div className='flex-1'>
          {activeTab === "dashboard" && (
            <div className='space-y-6'>
              {/* Sort options */}
              {subjects.length > 0 && (
                <div className={`mb-6 flex justify-between items-center p-4 rounded-xl ${darkMode ? "bg-gray-900 bg-opacity-60 backdrop-blur-md border border-gray-800 border-opacity-40" : "bg-white shadow-md"}`}>
                  <div className='text-sm font-medium'>Sort by:</div>
                  <div className='flex space-x-3'>
                    <button
                      onClick={() => toggleSort("name")}
                      className={`px-3 py-2 text-sm rounded-lg flex items-center transition-all duration-200
                      ${sortField === "name" ? `${darkMode ? "bg-purple-900 bg-opacity-50 text-purple-200 border border-purple-700" : "bg-purple-100 text-purple-800"}` : `${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"}`}`}
                    >
                      Name
                      {sortField === "name" && (sortDirection === "asc" ? <ArrowUp size={14} className='ml-1' /> : <ArrowDown size={14} className='ml-1' />)}
                    </button>
                    <button
                      onClick={() => toggleSort("percentage")}
                      className={`px-3 py-2 text-sm rounded-lg flex items-center transition-all duration-200
                      ${sortField === "percentage" ? `${darkMode ? "bg-purple-900 bg-opacity-50 text-purple-200 border border-purple-700" : "bg-purple-100 text-purple-800"}` : `${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"}`}`}
                    >
                      Percentage
                      {sortField === "percentage" && (sortDirection === "asc" ? <ArrowUp size={14} className='ml-1' /> : <ArrowDown size={14} className='ml-1' />)}
                    </button>
                    <button
                      onClick={() => toggleSort("status")}
                      className={`px-3 py-2 text-sm rounded-lg flex items-center transition-all duration-200
                      ${sortField === "status" ? `${darkMode ? "bg-purple-900 bg-opacity-50 text-purple-200 border border-purple-700" : "bg-purple-100 text-purple-800"}` : `${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"}`}`}
                    >
                      Status
                      {sortField === "status" && (sortDirection === "asc" ? <ArrowUp size={14} className='ml-1' /> : <ArrowDown size={14} className='ml-1' />)}
                    </button>
                  </div>
                </div>
              )}

              {subjects.length === 0 ? (
                <div className={`text-center p-10 rounded-2xl ${darkMode ? "bg-gray-900 bg-opacity-60 backdrop-blur-md border border-gray-800 border-opacity-40" : "bg-white shadow-lg"} transition-all duration-500 transform hover:scale-[1.01]`}>
                  <div className='text-center'>
                    <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${darkMode ? "bg-gray-800 bg-opacity-70" : "bg-purple-50"}`}>
                      <Calendar className={`${darkMode ? "text-purple-400" : "text-purple-500"}`} size={36} />
                    </div>
                    <p className='mb-6 text-lg'>No subjects added yet.</p>
                    <button
                      onClick={() => {
                        setActiveTab("manage");
                        setShowAddForm(true);
                      }}
                      className={`px-5 py-3 rounded-xl ${darkMode ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500" : "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"} text-white flex items-center justify-center mx-auto hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
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
                      className={`rounded-xl ${darkMode ? "bg-gray-900 bg-opacity-60 backdrop-blur-md border border-gray-800 border-opacity-40" : "bg-white shadow-lg"} overflow-hidden transition-all duration-300 transform hover:scale-[1.01] ${isExpanded ? "scale-[1.01]" : ""}`}
                      style={{
                        opacity: 0,
                        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`,
                      }}
                    >
                      <div className='p-5 cursor-pointer' onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}>
                        <div className='flex justify-between items-center mb-3'>
                          <div className='flex items-center'>
                            <h3 className='text-xl font-semibold mr-3'>{subject.name}</h3>
                            {trend === "improving" && <div className={`${darkMode ? "bg-green-900 bg-opacity-30 text-green-300" : "bg-green-100 text-green-800"} text-xs px-3 py-1 rounded-full`}>Improving</div>}
                            {trend === "declining" && <div className={`${darkMode ? "bg-red-900 bg-opacity-30 text-red-300" : "bg-red-100 text-red-800"} text-xs px-3 py-1 rounded-full`}>Declining</div>}
                          </div>
                          <div
                            className={`px-4 py-2 rounded-full text-sm font-medium
                            ${status === "good" ? `${darkMode ? "bg-green-900 bg-opacity-30 text-green-300 border border-green-800 border-opacity-30" : "bg-green-100 text-green-800"}` : status === "warning" ? `${darkMode ? "bg-yellow-900 bg-opacity-30 text-yellow-300 border border-yellow-800 border-opacity-30" : "bg-yellow-100 text-yellow-800"}` : `${darkMode ? "bg-red-900 bg-opacity-30 text-red-300 border border-red-800 border-opacity-30" : "bg-red-100 text-red-800"}`}`}
                          >
                            {formatPercentage(currentPercentage)} / {subject.targetPercentage}% Target
                          </div>
                        </div>

                        <ProgressBar current={currentPercentage} target={subject.targetPercentage} status={status} />

                        <div className='grid grid-cols-3 gap-4 mt-5'>
                          <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 border-opacity-30" : "bg-gray-50"} transition-all duration-300`}>
                            <div className='flex justify-between'>
                              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Attendance</p>
                              <CheckCircle size={16} className={status === "good" ? "text-green-500" : "text-gray-400"} />
                            </div>
                            <p className='font-semibold mt-1'>
                              {subject.attended} / {subject.total} Classes
                            </p>
                          </div>
                          <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 border-opacity-30" : "bg-gray-50"} transition-all duration-300`}>
                            <div className='flex justify-between'>
                              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Can Skip</p>
                              <Clock size={16} className={canSkip > 0 ? "text-blue-500" : "text-gray-400"} />
                            </div>
                            <p className='font-semibold mt-1'>
                              {canSkip} {canSkip === 1 ? "Class" : "Classes"}
                            </p>
                          </div>
                          <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 border-opacity-30" : "bg-gray-50"} transition-all duration-300`}>
                            <div className='flex justify-between'>
                              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Status</p>
                              {status === "good" ? <Award size={16} className='text-green-500' /> : status === "warning" ? <AlertTriangle size={16} className='text-yellow-500' /> : <XCircle size={16} className='text-red-500' />}
                            </div>
                            <p className='font-semibold mt-1'>{status === "good" ? "On Track" : status === "warning" ? "At Risk" : "Critical"}</p>
                            {renderMiniChart(subject)}
                          </div>
                        </div>

                        <ChevronRight size={16} className={`ml-auto mt-3 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""} ${darkMode ? "text-gray-300" : "text-gray-600"}`} />
                      </div>

                      {/* Expanded section */}
                      {isExpanded && (
                        <div className={`p-5 border-t ${darkMode ? "border-gray-800" : "border-gray-100"} transition-opacity duration-500`}>
                          <h4 className='font-medium mb-3'>Actions</h4>
                          <div className='flex space-x-3'>
                            <button onClick={() => recordAttendance(subject.id, "attended")} className={`px-4 py-2 rounded-lg flex items-center ${darkMode ? "bg-green-800 bg-opacity-30 text-green-400 hover:bg-opacity-40 border border-green-800 border-opacity-30" : "bg-green-100 text-green-700 hover:bg-green-200"} transition-all duration-200`}>
                              <CheckCircle size={16} className='mr-2' />
                              Present
                            </button>
                            <button onClick={() => recordAttendance(subject.id, "missed")} className={`px-4 py-2 rounded-lg flex items-center ${darkMode ? "bg-red-800 bg-opacity-30 text-red-400 hover:bg-opacity-40 border border-red-800 border-opacity-30" : "bg-red-100 text-red-700 hover:bg-red-200"} transition-all duration-200`}>
                              <XCircle size={16} className='mr-2' />
                              Absent
                            </button>
                            <button onClick={() => handleUndoLastAttendance(subject.id)} className={`px-4 py-2 rounded-lg flex items-center ${darkMode ? "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700 border-opacity-30" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} transition-all duration-200`}>
                              <RotateCcw size={16} className='mr-2' />
                              Undo
                            </button>
                          </div>

                          {subject.history && subject.history.length > 0 && (
                            <div className='mt-5'>
                              <h4 className='font-medium mb-3'>Recent History</h4>
                              <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                                {[...subject.history]
                                  .slice(-8)
                                  .reverse()
                                  .map((record, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-3 rounded-lg text-sm flex items-center justify-between
                                    ${record.status === "attended" ? `${darkMode ? "bg-green-900 bg-opacity-20 text-green-300 border border-green-800 border-opacity-20" : "bg-green-50 text-green-700 border border-green-100"}` : `${darkMode ? "bg-red-900 bg-opacity-20 text-red-300 border border-red-800 border-opacity-20" : "bg-red-50 text-red-700 border border-red-100"}`}
                                    `}
                                    >
                                      <span>{new Date(record.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                      {record.status === "attended" ? <CheckCircle size={16} className={darkMode ? "text-green-400" : "text-green-500"} /> : <XCircle size={16} className={darkMode ? "text-red-400" : "text-red-500"} />}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "manage" && (
            <div className='space-y-6'>
              {/* Add Subject Form */}
              {!showAddForm ? (
                <button onClick={() => setShowAddForm(true)} className={`w-full p-4 rounded-xl mb-6 flex items-center justify-center ${darkMode ? "bg-gray-900 bg-opacity-60 backdrop-blur-md text-purple-400 border border-purple-900 border-opacity-30 hover:bg-opacity-80" : "bg-white shadow-md hover:shadow-lg text-purple-600"} transition-all duration-300`}>
                  <PlusCircle size={20} className='mr-2' />
                  Add New Subject
                </button>
              ) : (
                <div className={`p-6 rounded-xl mb-6 ${darkMode ? "bg-gray-900 bg-opacity-60 backdrop-blur-md border border-gray-800 border-opacity-40" : "bg-white shadow-lg"}`}>
                  <h3 className='text-xl font-semibold mb-4'>Add New Subject</h3>
                  <div>
                    <div className='mb-4'>
                      <label className={`block mb-2 text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Subject Name</label>
                      <input type='text' value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} className={`w-full p-3 rounded-lg ${darkMode ? "bg-gray-800 text-white border border-gray-700" : "bg-gray-50 border border-gray-200"} focus:outline-none focus:ring-2 focus:ring-purple-500`} placeholder='e.g. Mathematics' />
                    </div>
                    <div className='mb-6'>
                      <label className={`block mb-2 text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Target Attendance (%)</label>
                      <input type='number' min='0' max='100' value={newSubject.targetPercentage} onChange={(e) => setNewSubject({ ...newSubject, targetPercentage: Number(e.target.value) })} className={`w-full p-3 rounded-lg ${darkMode ? "bg-gray-800 text-white border border-gray-700" : "bg-gray-50 border border-gray-200"} focus:outline-none focus:ring-2 focus:ring-purple-500`} />
                    </div>
                    <div className='flex space-x-3'>
                      <button onClick={handleAddSubject} className={`px-4 py-3 rounded-lg flex-1 flex items-center justify-center ${darkMode ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500" : "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"} text-white transition-all duration-300`}>
                        <Save size={18} className='mr-2' />
                        Save Subject
                      </button>
                      <button onClick={() => setShowAddForm(false)} className={`px-4 py-3 rounded-lg ${darkMode ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"} transition-all duration-300`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Subject List */}
              <div className='space-y-4'>
                <h3 className='text-xl font-semibold mb-4'>My Subjects</h3>
                {subjects.length === 0 ? (
                  <div className={`p-8 text-center rounded-xl ${darkMode ? "bg-gray-900 bg-opacity-60 backdrop-blur-md border border-gray-800 border-opacity-40" : "bg-white shadow-md"}`}>
                    <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>No subjects added yet.</p>
                  </div>
                ) : (
                  subjects.map((subject) => (
                    <div key={subject.id} className={`p-5 rounded-xl ${darkMode ? "bg-gray-900 bg-opacity-60 backdrop-blur-md border border-gray-800 border-opacity-40" : "bg-white shadow-md"} flex justify-between items-center`}>
                      {editingSubject && editingSubject.id === subject.id ? (
                        <div className='w-full'>
                          <div className='mb-3'>
                            <input type='text' value={editingSubject.name} onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })} className={`w-full p-3 rounded-lg ${darkMode ? "bg-gray-800 text-white border border-gray-700" : "bg-gray-50 border border-gray-200"} focus:outline-none focus:ring-2 focus:ring-purple-500`} />
                          </div>
                          <div className='mb-4'>
                            <label className={`block mb-1 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Target Attendance (%)</label>
                            <input
                              type='number'
                              min='0'
                              max='100'
                              value={editingSubject.targetPercentage}
                              onChange={(e) =>
                                setEditingSubject({
                                  ...editingSubject,
                                  targetPercentage: Number(e.target.value),
                                })
                              }
                              className={`w-full p-3 rounded-lg ${darkMode ? "bg-gray-800 text-white border border-gray-700" : "bg-gray-50 border border-gray-200"} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                            />
                          </div>
                          <div className='flex space-x-3'>
                            <button onClick={handleUpdateSubject} className={`px-4 py-2 rounded-lg ${darkMode ? "bg-green-800 bg-opacity-40 text-green-400 hover:bg-opacity-50" : "bg-green-100 text-green-700 hover:bg-green-200"} transition-all duration-200`}>
                              Save
                            </button>
                            <button onClick={() => setEditingSubject(null)} className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} transition-all duration-200`}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <h4 className='font-medium'>
                              {subject.name} <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>(Target: {subject.targetPercentage}%)</span>
                            </h4>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                              Attended {subject.attended} out of {subject.total} classes ({subject.total === 0 ? "0" : formatPercentage((subject.attended / subject.total) * 100)})
                            </p>
                          </div>
                          <div className='flex'>
                            <button onClick={() => setEditingSubject(subject)} className={`p-2 mr-2 rounded-lg ${darkMode ? "bg-gray-800 hover:bg-gray-700 text-blue-400" : "bg-gray-100 hover:bg-gray-200 text-blue-600"} transition-all duration-200`}>
                              <Settings size={18} />
                            </button>
                            <button onClick={() => handleDeleteSubject(subject.id)} className={`p-2 rounded-lg ${darkMode ? "bg-gray-800 hover:bg-gray-700 text-red-400" : "bg-gray-100 hover:bg-gray-200 text-red-600"} transition-all duration-200`}>
                              {showConfirmDelete === subject.id ? <CheckCircle size={18} className='text-red-500' /> : <Trash2 size={18} />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className='space-y-6'>
              {/* Stats view selection */}
              <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-900 bg-opacity-60 backdrop-blur-md border border-gray-800 border-opacity-40" : "bg-white shadow-md"} flex justify-between items-center mb-6`}>
                <h3 className='font-medium'>Statistics View</h3>
                <div className='flex space-x-3'>
                  <button
                    onClick={() => setStatsType("weekly")}
                    className={`px-4 py-2 text-sm rounded-lg transition-all duration-200
                    ${statsType === "weekly" ? `${darkMode ? "bg-purple-900 bg-opacity-50 text-purple-200 border border-purple-700" : "bg-purple-100 text-purple-800"}` : `${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"}`}`}
                  >
                    Weekly
                  </button>
                </div>
              </div>

              {subjects.length === 0 ? (
                <div className={`p-8 text-center rounded-xl ${darkMode ? "bg-gray-900 bg-opacity-60 backdrop-blur-md border border-gray-800 border-opacity-40" : "bg-white shadow-md"}`}>
                  <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Add subjects to see statistics</p>
                </div>
              ) : (
                subjects.map((subject) => {
                  const data = getAttendanceData(subject);
                  const currentPercentage = subject.total === 0 ? 100 : (subject.attended / subject.total) * 100;
                  const status = getAttendanceStatus(subject.attended, subject.total, subject.targetPercentage);

                  return (
                    <div key={subject.id} className={`p-5 rounded-xl ${darkMode ? "bg-gray-900 bg-opacity-60 backdrop-blur-md border border-gray-800 border-opacity-40" : "bg-white shadow-md"} mb-6`}>
                      <div className='flex justify-between items-center mb-4'>
                        <h3 className='text-lg font-medium'>{subject.name}</h3>
                        <div
                          className={`px-4 py-2 rounded-full text-sm font-medium
                          ${status === "good" ? `${darkMode ? "bg-green-900 bg-opacity-30 text-green-300 border border-green-800 border-opacity-30" : "bg-green-100 text-green-800"}` : status === "warning" ? `${darkMode ? "bg-yellow-900 bg-opacity-30 text-yellow-300 border border-yellow-800 border-opacity-30" : "bg-yellow-100 text-yellow-800"}` : `${darkMode ? "bg-red-900 bg-opacity-30 text-red-300 border border-red-800 border-opacity-30" : "bg-red-100 text-red-800"}`}`}
                        >
                          {formatPercentage(currentPercentage)} / {subject.targetPercentage}% Target
                        </div>
                      </div>

                      {data.length > 0 ? (
                        <div className='mt-4'>
                          <div className='h-40 w-full'>
                            {/* This would be a chart component in a real application */}
                            <div className={`h-full flex items-end justify-between p-3 rounded-lg ${darkMode ? "bg-gray-800 bg-opacity-60" : "bg-gray-50"}`}>
                              {data.map((week, index) => (
                                <div key={index} className='flex flex-col items-center'>
                                  <div className='flex w-12 justify-center'>
                                    <div className='w-4 bg-green-500 opacity-80 rounded-t-sm' style={{ height: `${(week.attended / (week.attended + week.missed)) * 100}px` }}></div>
                                    <div className='w-4 bg-red-500 opacity-70 rounded-t-sm' style={{ height: `${(week.missed / (week.attended + week.missed)) * 100}px` }}></div>
                                  </div>
                                  <div className={`text-xs mt-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{week.week}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className='flex justify-center mt-4 space-x-6'>
                            <div className='flex items-center'>
                              <div className='w-3 h-3 rounded-full bg-green-500 opacity-80 mr-2'></div>
                              <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Attended</span>
                            </div>
                            <div className='flex items-center'>
                              <div className='w-3 h-3 rounded-full bg-red-500 opacity-70 mr-2'></div>
                              <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Missed</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`h-40 w-full flex items-center justify-center ${darkMode ? "bg-gray-800 bg-opacity-60 rounded-lg" : "bg-gray-50 rounded-lg"}`}>
                          <p className={darkMode ? "text-gray-400" : "text-gray-500"}>Not enough data to display chart</p>
                        </div>
                      )}

                      <div className='grid grid-cols-3 gap-4 mt-6'>
                        <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 border-opacity-30" : "bg-gray-50"} transition-all duration-300`}>
                          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Overall Attendance</p>
                          <p className='font-semibold mt-1'>{formatPercentage(currentPercentage)}</p>
                        </div>

                        <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 border-opacity-30" : "bg-gray-50"} transition-all duration-300`}>
                          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Classes Attended</p>
                          <p className='font-semibold mt-1'>{subject.attended}</p>
                        </div>

                        <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 border-opacity-30" : "bg-gray-50"} transition-all duration-300`}>
                          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Classes Missed</p>
                          <p className='font-semibold mt-1'>{subject.total - subject.attended}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className={`mt-12 py-4 border-t ${darkMode ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-500"} text-center text-sm`}>
        <p>Attendance Tracker © {new Date().getFullYear()}</p>
      </footer>

      {/* Custom Styles */}
      <style jsx>{`
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
      `}</style>
    </div>
  );
}