import { useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { useChatStore } from '../store/useChatStore';
import { useGroupStore } from '../store/useGroupStore';
import { useAuthStore } from '../store/useAuthStore';
import { MapPin, Calendar, Users, DollarSign, UserPlus, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

const SharedTrips = () => {
  const { trips, getTrips, isTripsLoading, isTripSubmitting, joinTrip } = useTripStore();
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    getTrips();
  }, [getTrips]);

  const sharedTrips = trips.filter(trip => {
    if (selectedUser) {
      // Filter trips shared with the selected user
      return trip.sharedWith?.includes(selectedUser._id) || trip.isPublic;
    } else if (selectedGroup) {
      // Filter trips shared with the selected group
      return trip.sharedGroups?.includes(selectedGroup._id) || trip.isPublic;
    } else {
      // If no chat/group is selected, show all shared trips
      return (trip?.sharedWith?.length > 0) || 
             (trip?.sharedGroups?.length > 0) || 
             trip?.isPublic;
    }
  });

  const handleJoinTrip = async (tripId) => {
    try {
      await joinTrip(tripId);
    } catch (error) {
      console.error('Failed to join trip:', error);
    }
  };

  const isUserInTrip = (trip) => {
    return trip.members?.some(member => member._id === authUser?._id || member === authUser?._id);
  };

  if (isTripsLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (sharedTrips.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        {selectedUser || selectedGroup 
          ? "No shared trips in this conversation"
          : "No shared trips available"}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">
        {selectedUser 
          ? `Trips shared with ${selectedUser.username}`
          : selectedGroup
          ? `Trips shared with ${selectedGroup.name}`
          : "Shared Trips"}
      </h2>
      <div className="space-y-4">
        {sharedTrips.map((trip) => (
          <div
            key={trip._id}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-lg">{trip.title}</h3>
              {!isUserInTrip(trip) ? (
                <button
                  onClick={() => handleJoinTrip(trip._id)}
                  disabled={isTripSubmitting}
                  className="btn btn-sm btn-primary gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Join Trip
                </button>
              ) : (
                <div className="flex items-center gap-2 text-success">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Joined</span>
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{trip.location || 'Location not specified'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'Start date not set'} -{' '}
                  {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : 'End date not set'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{(trip.members?.length || 0)} members</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Budget: ${trip.budget || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SharedTrips; 