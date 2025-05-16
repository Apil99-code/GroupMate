import { useState, useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Receipt, Plane } from "lucide-react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [activeTab, setActiveTab] = useState("chat");

  // Fetch messages and manage subscriptions
  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
    }

    return () => {
      unsubscribeFromMessages();
    };
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (messageEndRef.current && activeTab === "chat") {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  if (isMessagesLoading && activeTab === "chat") {
    return (
      <div className="flex flex-col h-full">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <ChatHeader />

      {/* Tab Navigation */}
      <div className="border-b border-base-300">
        <div className="grid grid-cols-3 w-full">
          <button
            className={`py-3 flex items-center justify-center gap-2 ${activeTab === "chat" ? "bg-base-300" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "chat" && (
        <>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {Array.isArray(messages) && messages.map((message) => {
              console.log('Rendering private message:', message);
              const isSender = message.senderId === authUser._id;
              const senderInfo = isSender ? authUser : selectedUser;
              
              return (
                <div
                  key={message._id}
                  className={`chat ${isSender ? "chat-end" : "chat-start"}`}
                >
                  {/* Avatar */}
                  <div className="chat-image avatar">
                    <div className="size-10 rounded-full border border-base-300">
                      <img
                        src={senderInfo?.profilePic || "/avatar.png"}
                        alt={`${senderInfo?.fullName || 'User'}'s profile`}
                      />
                    </div>
                  </div>

                  {/* Message Header */}
                  <div className="chat-header">
                    <span className="font-medium">
                      {isSender ? "You" : senderInfo?.fullName || "User"}
                    </span>
                    <time className="text-xs opacity-50 ml-2">
                      {formatMessageTime(message.createdAt)}
                    </time>
                  </div>

                  {/* Message Content */}
                  <div className={`chat-bubble ${isSender ? "chat-bubble-primary" : ""}`}>
                    <div className="flex flex-col gap-2">
                      {message.image && (
                        <div className="mb-2">
                          <img
                            src={message.image}
                            alt="Message attachment"
                            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(message.image, '_blank')}
                            onError={(e) => {
                              console.error("Error loading image:", e);
                              e.target.src = "/placeholder-image.png";
                            }}
                          />
                        </div>
                      )}
                      {message.text && (
                        <p className="whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>

          {/* Message Input (Sticky Bottom) */}
          <div className="border-t border-base-300 p-4">
            <MessageInput isPrivate={true} />
          </div>
        </>
      )}
    </div>
  );
};

export default ChatContainer;