import { useState, useEffect } from 'react';
import { useGroupStore } from '../store/useGroupStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../store/useTripStore';
import { 
  MapPin, 
  Users, 
  Receipt, 
  MessageSquare, 
  Calendar, 
  ChevronRight,
  Plane,
  Hotel,
  Utensils,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

function TripImageFallback({ image, title }) {
  const [imgError, setImgError] = useState(false);
  const initial = title?.charAt(0)?.toUpperCase() || '?';
  return imgError || !image ? (
    <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-primary text-white text-2xl font-bold">
      {initial}
    </div>
  ) : (
    <img
      src={image}
      alt={title}
      className="w-16 h-16 rounded-lg object-cover"
      onError={() => setImgError(true)}
    />
  );
}

const DashboardPage = () => {
  const { groups, getGroups } = useGroupStore();
  const { expenses, getExpenses } = useExpenseStore();
  const { authUser } = useAuthStore();
  const { trips, getTrips } = useTripStore();
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    getGroups();
    getExpenses();
    getTrips();
  }, [getGroups, getExpenses, getTrips]);

  useEffect(() => {
    // Mock recent activity (replace with actual data from your backend)
    setRecentActivity([
      {
        id: 1,
        type: 'message',
        content: 'New message in Paris Group',
        time: '2 hours ago'
      },
      {
        id: 2,
        type: 'expense',
        content: 'New expense added to Tokyo trip',
        time: '4 hours ago'
      },
      {
        id: 3,
        type: 'location',
        content: 'Location shared in Paris Group',
        time: '5 hours ago'
      }
    ]);
  }, []);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {authUser?.username}!</h1>
          <p className="text-gray-600">Here's what's happening with your trips</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Plane className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-600">Total Trips</h3>
                  <p className="text-2xl font-bold">{trips.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-600">Active Groups</h3>
                  <p className="text-2xl font-bold">{groups.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-600">Total Expenses</h3>
                  <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Trips */}
          <div className="lg:col-span-2">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Upcoming Trips</h2>
                  <Link to="/trip" className="btn btn-sm btn-ghost">
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-4">
                  {trips.slice(0, 4).map((trip) => (
                    <div key={trip._id} className="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
                      <TripImageFallback image={trip.image} title={trip.title} />
                      <div className="flex-1">
                        <h3 className="font-semibold">{trip.title}</h3>
                        <p className="text-sm text-gray-600">{trip.location}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {trip.startDate} - {trip.endDate}
                          </span>
                          <span className="text-sm flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {trip.members} members
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={activity.id || index} className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        {activity.type === 'message' && <MessageSquare className="w-5 h-5 text-primary" />}
                        {activity.type === 'expense' && <Receipt className="w-5 h-5 text-primary" />}
                        {activity.type === 'location' && <MapPin className="w-5 h-5 text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm">{activity.content}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;