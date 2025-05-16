import { useState } from "react";
import { X } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

const AddFriendModal = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);
  const { authUser, addNotification } = useAuthStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/users/search?name=${encodeURIComponent(search)}`);
      setResults(res.data);
    } catch (err) {
      setResults([]);
    }
    setLoading(false);
  };

  const handleAddFriend = async (userId) => {
    try {
      await axiosInstance.post("/friends/request", { to: userId });
      setSentRequests([...sentRequests, userId]);
      // Optionally trigger notification in auth store
      addNotification && addNotification({ type: "friend_request_sent", to: userId });
    } catch (err) {
      // Optionally show error
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button className="absolute top-2 right-2 btn btn-ghost btn-sm" onClick={onClose}>
          <X />
        </button>
        <h2 className="text-lg font-bold mb-4">Add Friend</h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            className="input input-bordered flex-1"
            placeholder="Search users by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            Search
          </button>
        </form>
        {loading && <div>Searching...</div>}
        <ul className="space-y-2">
          {results.map((user) => (
            <li key={user._id} className="flex items-center justify-between p-2 bg-base-200 rounded">
              <span>{user.fullName}</span>
              <button
                className="btn btn-sm btn-success"
                disabled={sentRequests.includes(user._id)}
                onClick={() => handleAddFriend(user._id)}
              >
                {sentRequests.includes(user._id) ? "Request Sent" : "Add Friend"}
              </button>
            </li>
          ))}
        </ul>
        {results.length === 0 && !loading && <div className="text-center text-base-content/70 py-4">No users found</div>}
      </div>
    </div>
  );
};

export default AddFriendModal; 