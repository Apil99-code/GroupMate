import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import GroupChatContainer from "../components/GroupChatContainer";

const HomePage = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { selectedGroup, setSelectedGroup } = useGroupStore();

  // When a user is selected, clear group selection and vice versa
  const handleUserSelect = (user) => {
    setSelectedGroup(null);
    setSelectedUser(user);
  };

  const handleGroupSelect = (group) => {
    setSelectedUser(null);
    setSelectedGroup(group);
  };

  // Determine which container to show
  const renderContainer = () => {
    if (selectedGroup) {
      return <GroupChatContainer />;
    }
    if (selectedUser) {
      return <ChatContainer />;
    }
    return <NoChatSelected />;
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-20">
        <div className="bg-base-100 rounded-lg shadow-xl w-full h-[calc(100vh-6rem)]">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 border-r border-base-300">
              <Sidebar 
                onUserSelect={handleUserSelect}
                onGroupSelect={handleGroupSelect}
              />
            </div>

            {/* Main Chat Area */}
            <div className="flex-1">
              {renderContainer()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;