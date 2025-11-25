import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Eye,
  Users,
  UserCheck,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/authSlice";

const Oquvchilar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.accessToken);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchStudents = async () => {
    if (!token) {
      setError("No authentication token found. Please log in.");
      setLoading(false);
      dispatch(logout());
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        "https://zuhrstar-production.up.railway.app/api/students",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorMessages = {
          401: "Authentication failed. Please log in again.",
          403: "You do not have permission to access this resource.",
          500: "Server error. Please try again later.",
        };
        if (response.status === 401) {
          dispatch(logout());
          navigate("/login");
        }
        throw new Error(
          errorMessages[response.status] ||
          `HTTP error! Status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Fetched students:", data);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Ma'lumotlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [token]);

  const totalStudents = students.length;
  const activeStudents = students.filter((student) => student.active).length;
  const noGroupStudents = students.filter((student) => !student.group).length;
  const debtors = students.filter((student) =>
    student.balance?.includes("-")
  ).length;

  const filteredStudents = students.filter(
    (student) =>
      student.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      student.surname?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      student.student_phone?.includes(searchTerm)
  );

  const handleViewDetails = (student) => {
    if (!student._id) {
      return;
    }
    setSelectedStudent(student);
    setShowDetails(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">O'QUVCHILAR</h1>
          <div className="text-sm text-gray-500">O'quvchilar</div>
        </div>

        {/* Modal for viewing student details */}
        {showDetails && selectedStudent && (
          <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
            <div className="bg-white p-6 rounded-xl shadow-xl w-96 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                O'quvchi ma'lumotlari
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-lg font-medium text-blue-700">
                    {selectedStudent.name?.charAt(0)}
                    {selectedStudent.surname?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {selectedStudent.name} {selectedStudent.surname}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {selectedStudent.student_phone || "Kiritilmagan"}
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">
                      Ota-ona telefoni:
                    </span>{" "}
                    <span className="text-gray-600">
                      {selectedStudent.parents_phone || "Kiritilmagan"}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">
                      Tug'ilgan sana:
                    </span>{" "}
                    <span className="text-gray-600">
                      {selectedStudent.birth_date || "Kiritilmagan"}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Jinsi:</span>{" "}
                    <span className="text-gray-600">
                      {selectedStudent.gender || "Kiritilmagan"}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Guruh:</span>{" "}
                    <span className="text-blue-600 text-sm">
                      {selectedStudent.group || "Guruhsiz"}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Balans:</span>{" "}
                    <span
                      className={
                        selectedStudent.balance?.includes("-")
                          ? "text-red-600 font-medium"
                          : "text-green-600 font-medium"
                      }
                    >
                      {selectedStudent.balance || "0 UZS"}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Holati:</span>{" "}
                    <span
                      className={
                        selectedStudent.active
                          ? "text-green-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      {selectedStudent.active ? "Faol" : "Nofaol"}
                    </span>
                  </p>
                  {selectedStudent.note && (
                    <p className="text-sm">
                      <span className="font-medium text-gray-700">Eslatma:</span>{" "}
                      <span className="text-gray-600">{selectedStudent.note}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {totalStudents}
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  O'QUVCHILAR SONI
                </div>
              </div>
              <div className="text-blue-500">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-cyan-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {activeStudents}
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  FAOL
                </div>
              </div>
              <div className="text-cyan-500">
                <UserCheck className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {noGroupStudents}
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  GURUHSIZ O'QUVCHILAR
                </div>
              </div>
              <div className="text-orange-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-red-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {debtors}
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  QARZDOR
                </div>
              </div>
              <div className="text-red-500">
                <CreditCard className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Qidirish ..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              Filter
            </button>

            <div className="relative">
              <button
                onClick={() => setShowImportExport(!showImportExport)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Download className="w-4 h-4" />
                Export
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {showImportExport && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Download className="w-4 h-4" />
                    Export Excel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStudents}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className="w-4 h-4" />
              Yangilash
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 mb-6 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchStudents}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-1">ID</div>
              <div className="col-span-3">To'liq ismi</div>
              <div className="col-span-2">Telefon raqami</div>
              <div className="col-span-2">Guruh</div>
              <div className="col-span-2">Filial</div>
              <div className="col-span-1">Balans</div>
              <div className="col-span-1 text-center">Amallar</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-gray-500">Yuklanmoqda...</div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Hech qanday o'quvchi topilmadi
              </div>
            ) : (
              filteredStudents.map((student, idx) => (
                <div
                  key={student._id || idx}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center text-sm">
                    <div className="col-span-1 text-gray-900 font-medium">
                      {idx + 1}
                    </div>

                    <div className="col-span-3 flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700 mr-3">
                        {student.name?.charAt(0) || ""}
                        {student.surname?.charAt(0) || ""}
                      </div>
                      <span className="font-medium text-gray-900">
                        {student.name} {student.surname}
                      </span>
                    </div>

                    <div className="col-span-2 text-gray-600">
                      {student.student_phone}
                    </div>

                    <div className="col-span-2">
                      <span className="text-blue-600 text-sm">
                        {student.group || "Guruhsiz"}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        Asosiy filial
                      </span>
                    </div>

                    <div
                      className={`col-span-1 font-medium text-sm ${student.balance?.includes("-")
                        ? "text-red-600"
                        : "text-green-600"
                        }`}
                    >
                      {student.balance || "0 UZS"}
                    </div>

                    <div className="col-span-1 flex gap-2 justify-center">
                      <button
                        onClick={() => handleViewDetails(student)}
                        className="w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center transition-colors"
                        title="Ko'rish"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Oquvchilar;