"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Clock, Trash2, FileText } from "lucide-react";
import { SavedInputService, type SavedInput } from "@/services/savedInputs";
import { toast } from "react-toastify";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onLoadInput: (savedInput: SavedInput) => void;
};

export default function InputsHistoryModal({ isOpen, onClose, onLoadInput }: Props) {
  const router = useRouter();
  const [savedInputs, setSavedInputs] = useState<SavedInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSavedInputs();
    }
  }, [isOpen]);

  const fetchSavedInputs = async () => {
    try {
      setLoading(true);
      const inputs = await SavedInputService.getAll();
      setSavedInputs(inputs);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load saved inputs");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      setDeleting(id);
      await SavedInputService.delete(id);
      setSavedInputs((prev) => prev.filter((item) => item._id !== id));
      toast.success("Deleted successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const handleLoad = (savedInput: SavedInput) => {
    onClose();
    // Navigate to dashboard first
    router.push("/dashboard");
    // Dispatch custom event after a brief delay to ensure form is mounted
    setTimeout(() => {
      const event = new CustomEvent("load-saved-input", { detail: savedInput });
      window.dispatchEvent(event);
    }, 300);
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-xl">
              <FileText className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Inputs History</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {savedInputs.length} saved {savedInputs.length === 1 ? "input" : "inputs"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-200 border-t-rose-600"></div>
            </div>
          ) : savedInputs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No saved inputs yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Save form data to access it later
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedInputs.map((item) => (
                <div
                  key={item._id}
                  className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:border-rose-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleLoad(item)}
                    >
                      <h3 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-rose-600 transition-colors">
                        {item.name}
                      </h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                        {item.formData.clientName && (
                          <div>
                            <span className="font-medium">Client:</span>{" "}
                            {item.formData.clientName}
                          </div>
                        )}
                        {item.formData.contractNo && (
                          <div>
                            <span className="font-medium">Contract:</span>{" "}
                            {item.formData.contractNo}
                          </div>
                        )}
                        {item.formData.appraisalPurpose && (
                          <div className="col-span-2">
                            <span className="font-medium">Purpose:</span>{" "}
                            {item.formData.appraisalPurpose}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(item._id, item.name)}
                      disabled={deleting === item._id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting === item._id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-red-600"></div>
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
