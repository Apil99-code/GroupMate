import { useState, useRef } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, MessageSquare, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = ({ isGroup, isPrivate, replyTo, onSend }) => {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);
  const { selectedGroup, sendGroupMessage, replyToMessage } = useGroupStore();
  const { selectedUser, sendMessage } = useChatStore();
  const { authUser } = useAuthStore();

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    try {
      toast.loading("Processing image...");
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        console.log("Image converted to base64:", base64String.substring(0, 100) + "...");
        setSelectedImage(base64String);
        toast.dismiss();
        toast.success("Image ready to send!");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image");
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && !selectedImage) return;
    if (isSending) return; // Prevent multiple submissions

    try {
      setIsSending(true);
      let messageData = {
        text: message.trim()
      };

      if (selectedImage) {
        messageData.image = selectedImage;
      }

      // Clear the input fields immediately for better UX
      setMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (isGroup && selectedGroup?._id) {
        console.log("Sending group message:", messageData);
        if (replyTo) {
          await replyToMessage(selectedGroup._id, messageData, replyTo._id);
        } else {
          await sendGroupMessage(selectedGroup._id, {
            ...messageData,
            type: 'text'
          });
        }
      } else if (isPrivate && selectedUser?._id) {
        console.log("Sending private message:", messageData);
        await sendMessage({
          ...messageData,
          receiverId: selectedUser._id,
          replyTo: replyTo?._id
        });
      }

      if (onSend) {
        onSend();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <input
          id="messageInput"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={replyTo ? `Reply to ${replyTo.senderId?.fullName || replyTo.senderId?.username || 'message'}...` : "Type a message..."}
          className="input input-bordered w-full"
          disabled={isSending}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-circle btn-ghost"
          disabled={isSending}
        >
          <Image className="w-5 h-5" />
        </button>
        <button
          type="submit"
          className="btn btn-circle btn-primary"
          disabled={isSending || (!message.trim() && !selectedImage)}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      {imagePreview && (
        <div className="absolute bottom-full left-0 p-2 bg-base-200 rounded-lg">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-xs rounded-lg"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default MessageInput;