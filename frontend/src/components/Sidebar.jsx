import { useState, useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";
import AddFriendModal from "./AddFriendModal";
import { axiosInstance } from "../lib/axios";

const Sidebar = ({ onUserSelect, onGroupSelect }) => {
  const { getGroups, groups, selectedGroup, isGroupsLoading } = useGroupStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);

  const [friends, setFriends] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const prevFriendsRef = useRef([]);

  useEffect(() => {
    getGroups();
    const fetchFriends = async () => {
      try {
        const res = await axiosInstance.get("/friends");
        setFriends(res.data);
      } catch (err) {
        setFriends([]);
      }
    };
    fetchFriends();
  }, [getGroups]);

  const filteredFriends = showOnlineOnly
    ? friends.filter((user) => onlineUsers.includes(user._id))
    : friends;

  if (isGroupsLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="font-medium hidden lg:block">Groups</span>
          <button className="btn btn-sm btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="size-4" />
          </button>
        </div>
        {groups.map((group) => (
          <button
            key={group._id}
            onClick={() => onGroupSelect(group)}
            className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
              selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""
            }`}
          >
            <div className="relative mx-auto lg:mx-0">
              <div className="size-12 object-cover rounded-full bg-primary flex items-center justify-center text-primary-content">
                {group.name[0].toUpperCase()}
              </div>
            </div>
            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{group.name}</div>
              <div className="text-sm text-base-content/70">
                {group.members?.length || 0} members
              </div>
            </div>
          </button>
        ))}
        
        <div className="divider my-2"></div>
        
        <div className="px-3 mb-2 flex items-center justify-between">
          <span className="font-medium hidden lg:block">Friends</span>
          <button className="btn btn-sm btn-primary" onClick={() => setIsAddFriendModalOpen(true)}>
            <Plus className="size-4" />
          </button>
        </div>
        {filteredFriends.map((user) => (
          <button
            key={user._id}
            onClick={() => {
              setSelectedUser(user);
              if (typeof onUserSelect === 'function') onUserSelect(user);
            }}
            className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
              selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""
            }`}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.fullName}
                className="size-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
              )}
            </div>
            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm text-base-content/70">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}
        {filteredFriends.length === 0 && (
          <div className="text-center text-base-content/70 py-4">No friends yet</div>
        )}
      </div>

      <CreateGroupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <AddFriendModal isOpen={isAddFriendModalOpen} onClose={() => setIsAddFriendModalOpen(false)} />
    </aside>
  );
};

export default Sidebar;