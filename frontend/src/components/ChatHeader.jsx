import { X, Users, Settings } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useState } from "react";
import GroupSettingsModal from "./GroupSettingsModal";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { selectedGroup, setSelectedGroup } = useGroupStore();
  const { onlineUsers } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleClose = () => {
    if (selectedUser) {
      setSelectedUser(null);
    } else if (selectedGroup) {
      setSelectedGroup(null);
    }
  };

  if (selectedGroup && selectedGroup._id) {
    return (
      <>
        <div className="p-2.5 border-b border-base-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Group Avatar */}
              <div className="avatar">
                <div className="size-10 rounded-full bg-primary flex items-center justify-center text-primary-content">
                  <Users size={20} />
                </div>
              </div>

              {/* Group info */}
              <div>
                <h3 className="font-medium">{selectedGroup.name}</h3>
                <p className="text-sm text-base-content/70">
                  {selectedGroup.members?.length || 0} members
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsSettingsOpen(true)} 
                className="btn btn-ghost btn-sm btn-circle"
                title="Group Settings"
              >
                <Settings size={20} />
              </button>
              <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
        <GroupSettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          group={selectedGroup}
        />
      </>
    );
  }

  if (selectedUser && selectedUser._id) {
    return (
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="avatar">
              <div className="size-10 rounded-full relative">
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
                {onlineUsers.includes(selectedUser._id) && (
                  <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
                )}
              </div>
            </div>

            {/* User info */}
            <div>
              <h3 className="font-medium">{selectedUser.fullName}</h3>
              <p className="text-sm text-base-content/70">
                {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ChatHeader;
