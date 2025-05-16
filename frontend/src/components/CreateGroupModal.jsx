import { useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const { users } = useChatStore();
  const { createGroup, isCreatingGroup } = useGroupStore();
  const { authUser } = useAuthStore();

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    try {
      // Include the current user in the members list
      const memberIds = [...selectedMembers, authUser._id];
      await createGroup({ name: groupName.trim(), memberIds });
      toast.success("Group created successfully!");
      setGroupName("");
      setSelectedMembers([]);
      onClose();
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error(error.message || "Failed to create group");
    }
  };

  const handleMemberToggle = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  const availableUsers = users.filter(user => user._id !== authUser._id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-base-100 rounded-lg p-6 w-full max-w-md shadow-xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Create Group</h2>
          <button 
            onClick={onClose} 
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isCreatingGroup}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Group Name</span>
            </label>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input input-bordered w-full"
              disabled={isCreatingGroup}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Select Members</span>
              <span className="label-text-alt">{selectedMembers.length} selected</span>
            </label>
            <div className="bg-base-200 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {availableUsers.map((user) => (
                <label 
                  key={user._id} 
                  className="flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(user._id)}
                    onChange={() => handleMemberToggle(user._id)}
                    className="checkbox checkbox-sm"
                    disabled={isCreatingGroup}
                  />
                  <div className="flex items-center gap-2">
                    <div className="avatar">
                      <div className="w-8 h-8 rounded-full">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <span className="font-medium">{user.fullName}</span>
                  </div>
                </label>
              ))}
              {availableUsers.length === 0 && (
                <p className="text-center text-base-content/70 py-2">No users available</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button 
              className="btn btn-ghost" 
              onClick={onClose}
              disabled={isCreatingGroup}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateGroup}
              disabled={isCreatingGroup || !groupName.trim() || selectedMembers.length === 0}
            >
              {isCreatingGroup ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal; 