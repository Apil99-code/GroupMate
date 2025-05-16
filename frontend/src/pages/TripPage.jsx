import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import { format } from 'date-fns';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Plus, 
  Calendar, 
  Users, 
  MapPin, 
  DollarSign, 
  Search, 
  Filter,
  List,
  Grid,
  Clock,
  Plane,
  Hotel,
  Utensils,
  Trash2,
  Navigation,
  Route,
  CheckCircle,
  Receipt,
  User
} from 'lucide-react';
import { useTripStore } from '../store/useTripStore';
import { useGroupStore } from '../store/useGroupStore';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { useNotesStore } from '../store/useNotesStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { Link } from 'react-router-dom';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create a custom green icon for shared locations
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create a custom red flag icon
const redFlagIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// MapEvents component to handle double click
function MapEvents({ onDoubleClick }) {
  useMapEvents({
    dblclick: (e) => {
      onDoubleClick(e.latlng);
    },
  });
  return null;
}

// Kathmandu coordinates [latitude, longitude]
const KATHMANDU_COORDINATES = [27.7172, 85.3240];

// Kathmandu area bounds and locations (coordinates in [latitude, longitude] format)
const KATHMANDU_LOCATIONS = [
  { name: "Thamel", coordinates: [27.7154, 85.3123] },
  { name: "Durbar Square", coordinates: [27.7049, 85.3071] },
  { name: "Boudhanath Stupa", coordinates: [27.7215, 85.3620] },
  { name: "Swayambhunath", coordinates: [27.7149, 85.2903] },
  { name: "Pashupatinath Temple", coordinates: [27.7109, 85.3488] },
  { name: "New Road", coordinates: [27.7041, 85.3131] },
  { name: "Patan Durbar Square", coordinates: [27.6726, 85.3239] },
  { name: "Bhaktapur Durbar Square", coordinates: [27.6720, 85.4279] },
  { name: "Garden of Dreams", coordinates: [27.7143, 85.3150] },
  { name: "Kirtipur", coordinates: [27.6747, 85.2767] }
];

// Add default placeholder image URL
const DEFAULT_TRIP_IMAGE = 'https://placehold.co/150x150/e2e8f0/1e293b?text=Trip';

function TripImageFallback({ image, title, className }) {
  const [imgError, setImgError] = useState(false);
  const initial = title?.charAt(0)?.toUpperCase() || '?';
  return imgError || !image ? (
    <div className={`w-24 h-24 rounded-lg flex items-center justify-center bg-primary text-white text-3xl font-bold ${className || ''}`}>
      {initial}
    </div>
  ) : (
    <img
      src={image}
      alt={title}
      className={`w-24 h-24 rounded-lg object-cover bg-gray-100 ${className || ''}`}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
}

const TripPage = () => {
  const { 
    trips, 
    selectedTrip, 
    isTripsLoading, 
    isTripSubmitting,
    getTrips, 
    createTrip, 
    updateTrip, 
    deleteTrip,
    setSelectedTrip,
    clearSelectedTrip,
    shareTrip,
    toggleEditModal,
    toggleShareModal,
    showEditModal,
    showShareModal,
    sharedLocations,
    shareLocation
  } = useTripStore();

  const { groups } = useGroupStore();

  const { authUser } = useAuthStore();

  const { 
    notes,
    isLoading: isNotesLoading,
    getNotes,
    createNote,
    deleteNote
  } = useNotesStore();

  const { expenses, getExpenses } = useExpenseStore();

  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [mapDefaults, setMapDefaults] = useState({
    center: KATHMANDU_COORDINATES,
    zoom: 12
  });
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTripForm, setNewTripForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    location: '',
    coordinates: [0, 0],
    groupId: '',
    budget: 0,
    status: 'planning',
    description: '',
    image: '',
    activities: [],
    accommodation: '',
    transportation: ''
  });

  const [showShareTripModal, setShowShareTripModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [flagMarkers, setFlagMarkers] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [tempMarkerPosition, setTempMarkerPosition] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [route, setRoute] = useState(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [routeDetails, setRouteDetails] = useState(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [hasOngoingTrip, setHasOngoingTrip] = useState(false);

  useEffect(() => {
    getTrips();
  }, [getTrips]);

  // Load notes when component mounts
  useEffect(() => {
    getNotes();
  }, [getNotes]);

  // Get current location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Could not get your current location');
        }
      );
    }
  }, []);

  // Reset map when modal opens/closes
  useEffect(() => {
    if (showNewTripModal) {
      setMapDefaults({
        center: KATHMANDU_COORDINATES,
        zoom: 12
      });
    }
  }, [showNewTripModal]);

  // Add effect to update members when group is selected
  useEffect(() => {
    if (newTripForm.groupId) {
      const selectedGroup = groups.find(group => group._id === newTripForm.groupId);
      if (selectedGroup) {
        setSelectedGroupMembers(selectedGroup.members || []);
      }
    } else {
      setSelectedGroupMembers([]);
    }
  }, [newTripForm.groupId, groups]);

  // Check for ongoing trips when trips load
  useEffect(() => {
    const ongoingTrip = trips.find(trip => trip.status === 'ongoing');
    setHasOngoingTrip(!!ongoingTrip);
    
    // If there's an ongoing trip, select it and load its route
    if (ongoingTrip) {
      setSelectedTrip(ongoingTrip);
      handleTripSelect(ongoingTrip);
      loadRouteForTrip(ongoingTrip);
    }
  }, [trips]);

  // Add effect to load expenses
  useEffect(() => {
    getExpenses();
  }, [getExpenses]);

  const handleTripSelect = (trip) => {
    setSelectedTrip(trip);
    setMapDefaults({
      center: trip.coordinates,
      zoom: 12
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTrips = trips.filter(trip => {
    const matchesStatus = filterStatus === 'all' ? true : trip.status === filterStatus;
    const matchesSearch = trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         trip.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Update expense filtering to only include expenses directly associated with this trip
  const tripExpenses = expenses.filter(expense => {
    return expense.trip === selectedTrip?._id;
  });

  const totalTripExpenses = tripExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const personalExpenses = tripExpenses.filter(expense => !expense.isGroupExpense);
  const groupExpenses = tripExpenses.filter(expense => expense.isGroupExpense);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      if (!authUser?._id) {
        toast.error('Please login to create a trip');
        return;
      }
      
      if (!newTripForm.groupId) {
        toast.error('Please select a group for the trip');
        return;
      }

      const tripData = {
        ...newTripForm,
        userId: authUser._id,
        destination: newTripForm.location,
        coordinates: newTripForm.coordinates,
        members: selectedGroupMembers.map(member => member._id), // Add members to trip
        status: 'planning'
      };
      
      await createTrip(tripData);
      setShowNewTripModal(false);
      setNewTripForm({
        title: '',
        startDate: '',
        endDate: '',
        location: '',
        coordinates: KATHMANDU_COORDINATES,
        groupId: '',
        budget: 0,
        status: 'planning',
        description: '',
        image: '',
        activities: [],
        accommodation: '',
        transportation: ''
      });
      setSelectedGroupMembers([]);
      toast.success('Trip created and shared with group members');
    } catch (error) {
      console.error('Failed to create trip:', error);
      toast.error(error.response?.data?.message || 'Failed to create trip');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    try {
      await deleteTrip(tripId);
    } catch (error) {
      console.error('Failed to delete trip:', error);
    }
  };

  const handleUpdateTrip = async (tripId, updates) => {
    try {
      await updateTrip(tripId, updates);
    } catch (error) {
      console.error('Failed to update trip:', error);
    }
  };

  // Function to determine available status options based on current status
  const getAvailableStatuses = (currentStatus) => {
    switch (currentStatus) {
      case 'planning':
        return ['planning', 'ongoing'];
      case 'ongoing':
        return ['ongoing', 'completed'];
      case 'completed':
        return ['completed'];
      default:
        return ['planning'];
    }
  };

  // Function to get status label and color
  const getStatusInfo = (status) => {
    switch (status) {
      case 'planning':
        return {
          label: 'Planning',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Calendar className="w-4 h-4" />
        };
      case 'ongoing':
        return {
          label: 'Ongoing',
          color: 'bg-green-100 text-green-800',
          icon: <Route className="w-4 h-4" />
        };
      case 'completed':
        return {
          label: 'Completed',
          color: 'bg-gray-100 text-gray-800',
          icon: <CheckCircle className="w-4 h-4" />
        };
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800',
          icon: null
        };
    }
  };

  // New function to load route for a trip
  const loadRouteForTrip = async (trip) => {
    if (!trip || !currentLocation) {
      return;
    }

    try {
      const start = `${currentLocation[1]},${currentLocation[0]}`; // [lng, lat]
      const end = `${trip.coordinates[1]},${trip.coordinates[0]}`; // [lng, lat]
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`
      );
      
      if (!response.ok) {
        throw new Error('Route calculation failed');
      }

      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        setRoute(routeCoordinates);
        setRouteDetails({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.ceil(route.duration / 60)
        });
        
        setShowNavigation(true);
        
        // Fit map to show the entire route
        const bounds = routeCoordinates.reduce(
          (bounds, coord) => bounds.extend(coord),
          L.latLngBounds(routeCoordinates[0], routeCoordinates[0])
        );
        
        const map = document.querySelector('.leaflet-container')?._leaflet_map;
        if (map) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      toast.error('Could not calculate route');
    }
  };

  // Update handleStatusChange to check for ongoing trips
  const handleStatusChange = async (newStatus) => {
    try {
      if (newStatus === 'ongoing') {
        // Check if the user is already associated with another ongoing trip (as a member)
        const userId = authUser?._id;
        const isUserInOtherOngoingTrip = trips.some(trip =>
          trip.status === 'ongoing' &&
          trip._id !== selectedTrip._id &&
          Array.isArray(trip.members) && trip.members.includes(userId)
        );
        if (isUserInOtherOngoingTrip) {
          toast.error('You are already associated with another ongoing trip. Complete or leave that trip first.');
          return;
        }
        // Confirm starting the trip
        if (!window.confirm('Are you sure you want to start this trip? You won\'t be able to return to planning status.')) {
          return;
        }
        // Check if location services are enabled
        if (!currentLocation) {
          toast.error('Please enable location services to start the trip');
          return;
        }
      } else if (newStatus === 'completed') {
        if (!window.confirm('Are you sure you want to mark this trip as completed? This action cannot be undone.')) {
          return;
        }
        // Clear route when completing trip
        setRoute(null);
        setShowNavigation(false);
        setRouteDetails(null);
      }
      await updateTrip(selectedTrip._id, { ...selectedTrip, status: newStatus });
      if (newStatus === 'ongoing') {
        setHasOngoingTrip(true);
        // Load route automatically when trip becomes ongoing
        await loadRouteForTrip(selectedTrip);
        toast.success('Trip started - Route loaded');
      } else if (newStatus === 'completed') {
        setHasOngoingTrip(false);
        toast.success('Trip completed');
      }
    } catch (error) {
      console.error('Failed to update trip status:', error);
      toast.error('Failed to update trip status');
    }
  };

  // Update handleStartTrip to use the loadRouteForTrip function
  const handleStartTrip = () => {
    if (!currentLocation || !selectedTrip) {
      toast.error('Please enable location services and select a trip');
      return;
    }

    loadRouteForTrip(selectedTrip);
  };

  // Add route refresh interval for ongoing trips
  useEffect(() => {
    let intervalId;
    
    if (selectedTrip?.status === 'ongoing' && currentLocation) {
      // Refresh route every 5 minutes
      intervalId = setInterval(() => {
        loadRouteForTrip(selectedTrip);
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedTrip, currentLocation]);

  // Add image error handler function
  const handleImageError = (e) => {
    e.target.src = DEFAULT_TRIP_IMAGE;
    e.target.onerror = null; // Prevent infinite loop if placeholder also fails
  };

  // Restore the missing handler functions
  const handleDoubleClick = (latlng) => {
    setTempMarkerPosition(latlng);
    setShowNoteModal(true);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    if (!tempMarkerPosition) {
      toast.error("Invalid location selected");
      return;
    }

    try {
      const noteData = {
        content: newNote.trim(),
        coordinates: [tempMarkerPosition.lng, tempMarkerPosition.lat]
      };

      await createNote(noteData);
      toast.success("Note added successfully");
      
      setNewNote('');
      setShowNoteModal(false);
      setTempMarkerPosition(null);
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error(error.response?.data?.message || "Failed to save note");
    }
  };

  const handleShareTrip = async (shareData) => {
    try {
      await shareTrip(selectedTrip._id, shareData);
      setShowShareTripModal(false);
      toast.success('Trip shared successfully');
    } catch (error) {
      console.error('Failed to share trip:', error);
      toast.error('Failed to share trip');
    }
  };

  const handleEditTrip = async (e) => {
    e.preventDefault();
    try {
      await updateTrip(selectedTrip._id, editFormData);
      setShowEditTripModal(false);
      toast.success('Trip updated successfully');
    } catch (error) {
      console.error('Failed to update trip:', error);
      toast.error('Failed to update trip');
    }
  };

  return (
    <div className="min-h-screen bg-base-200 pt-16">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Trips</h1>
            <p className="text-gray-600">Plan and manage your adventures</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="btn btn-ghost btn-sm"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowNewTripModal(true)}
              className="btn btn-primary gap-2"
            >
              <Plus className="w-4 h-4" />
              New Trip
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search trips..."
              className="input input-bordered w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          </div>
          <select 
            className="select select-bordered w-full md:w-48"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trip List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-base-100 rounded-box p-4">
              <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
                {isTripsLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <span className="loading loading-spinner loading-lg"></span>
                  </div>
                ) : filteredTrips.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No trips found
                  </div>
                ) : (
                  filteredTrips.map((trip) => (
                    <div
                      key={trip._id}
                      onClick={() => {
                        handleTripSelect(trip);
                        loadRouteForTrip(trip); // Show route for selected trip
                      }}
                      className={`card bg-base-100 shadow hover:shadow-lg cursor-pointer transition-all duration-300 ${
                        selectedTrip?._id === trip._id ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <div className="card-body p-4">
                        <div className="flex gap-4">
                          <TripImageFallback image={trip.image} title={trip.title} />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-lg">{trip.title}</h3>
                              {/* Only show delete button if the current user created the trip */}
                              {trip.userId === authUser?._id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTrip(trip._id);
                                  }}
                                  className="btn btn-ghost btn-sm text-error"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {trip.location}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(trip.status)}`}>
                                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(trip.startDate), 'MMM d')} -{' '}
                                {format(new Date(trip.endDate), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Map and Trip Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map Card */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-0" style={{ height: '400px' }}>
                <div className="absolute top-4 right-4 z-[999] flex gap-2">
                  {selectedTrip && currentLocation && (
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={handleStartTrip}
                    >
                      <Navigation className="w-4 h-4 mr-1" />
                      Start Trip
                    </button>
                  )}
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={async () => {
                      try {
                        const position = await new Promise((resolve, reject) => {
                          navigator.geolocation.getCurrentPosition(resolve, reject);
                        });
                        
                        const location = {
                          coordinates: [position.coords.longitude, position.coords.latitude],
                          latitude: position.coords.latitude,
                          longitude: position.coords.longitude,
                          timestamp: new Date(),
                          address: null
                        };
                        
                        await shareLocation(location, selectedTrip?._id);
                        setCurrentLocation([position.coords.latitude, position.coords.longitude]);
                        setMapDefaults({
                          center: [position.coords.latitude, position.coords.longitude],
                          zoom: 13
                        });
                        
                        toast.success("Location shared successfully");
                      } catch (error) {
                        console.error('Failed to share location:', error);
                        toast.error("Failed to share location");
                      }
                    }}
                  >
                    Share My Location
                  </button>
                </div>
                <MapContainer
                  center={mapDefaults.center}
                  zoom={mapDefaults.zoom}
                  style={{ height: '100%', width: '100%' }}
                  bounds={[
                    [27.6667, 85.2833],
                    [27.8167, 85.3667]
                  ]}
                  maxBounds={[
                    [27.5667, 85.1833],
                    [27.9167, 85.4667]
                  ]}
                  maxZoom={18}
                  minZoom={11}
                >
                  <MapEvents onDoubleClick={handleDoubleClick} />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* Current Location Marker */}
                  {currentLocation && (
                    <Marker position={currentLocation} icon={greenIcon}>
                      <Popup>Your Current Location</Popup>
                    </Marker>
                  )}
                  
                  {/* Trip Route */}
                  {route && showNavigation && (
                    <Polyline
                      positions={route}
                      color="blue"
                      weight={3}
                      opacity={0.7}
                    />
                  )}
                  
                  {/* Trip markers */}
                  {trips.map((trip) => (
                    <Marker
                      key={trip._id}
                      position={trip.coordinates}
                    >
                      <Popup>
                        <div className="text-center">
                          <h3 className="font-bold">{trip.title}</h3>
                          <p className="text-sm">{trip.location}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Shared location markers */}
                  {Object.entries(sharedLocations).map(([userId, location]) => (
                    <Marker
                      key={userId}
                      position={[location.latitude, location.longitude]}
                      icon={greenIcon}
                    >
                      <Popup>
                        <div className="text-center">
                          <h3 className="font-bold">Shared Location</h3>
                          <p className="text-sm">
                            {location.address || 'No address available'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(location.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Flag markers with notes */}
                  {notes.map((note) => (
                    <Marker
                      key={note._id}
                      position={[note.coordinates[1], note.coordinates[0]]}
                      icon={redFlagIcon}
                    >
                      <Popup>
                        <div className="text-center">
                          <h3 className="font-bold">Note</h3>
                          <p className="text-sm">{note.content}</p>
                          <button
                            className="btn btn-xs btn-error mt-2"
                            onClick={() => deleteNote(note._id)}
                          >
                            Remove Flag
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* Trip Details Card */}
            {selectedTrip && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="card-title text-2xl">{selectedTrip.title}</h2>
                      <p className="text-gray-600">{selectedTrip.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTrip.status !== 'completed' && (
                        <select
                          className={`select select-bordered select-sm ${getStatusInfo(selectedTrip.status).color}`}
                          value={selectedTrip.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          disabled={hasOngoingTrip && selectedTrip.status !== 'ongoing'}
                        >
                          {getAvailableStatuses(selectedTrip.status).map(status => (
                            <option 
                              key={status} 
                              value={status}
                              disabled={status === 'ongoing' && hasOngoingTrip && selectedTrip.status !== 'ongoing'}
                            >
                              {getStatusInfo(status).label}
                              {status === 'ongoing' && hasOngoingTrip && selectedTrip.status !== 'ongoing' ? ' (Another trip in progress)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  
                  {/* Trip Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-figure text-primary">
                        <Calendar className="w-8 h-8" />
                      </div>
                      <div className="stat-title">Duration</div>
                      <div className="stat-value text-lg">
                        {format(new Date(selectedTrip.startDate), 'MMM d')} -{' '}
                        {format(new Date(selectedTrip.endDate), 'MMM d')}
                      </div>
                    </div>
                    
                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-figure text-primary">
                        <Users className="w-8 h-8" />
                      </div>
                      <div className="stat-title">Members</div>
                      <div className="stat-value text-lg">{selectedTrip.members} people</div>
                    </div>
                    
                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-figure text-primary">
                        <MapPin className="w-8 h-8" />
                      </div>
                      <div className="stat-title">Location</div>
                      <div className="stat-value text-lg">{selectedTrip.location}</div>
                    </div>
                    
                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-figure text-primary">
                        <DollarSign className="w-8 h-8" />
                      </div>
                      <div className="stat-title">Budget</div>
                      <div className="stat-value text-lg">${selectedTrip.budget}</div>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h3 className="flex items-center gap-2 font-bold">
                          <Plane className="w-4 h-4" /> Transportation
                        </h3>
                        <p className="text-sm">{selectedTrip.transportation}</p>
                      </div>
                    </div>

                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h3 className="flex items-center gap-2 font-bold">
                          <Hotel className="w-4 h-4" /> Accommodation
                        </h3>
                        <p className="text-sm">{selectedTrip.accommodation}</p>
                      </div>
                    </div>

                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h3 className="flex items-center gap-2 font-bold">
                          <Utensils className="w-4 h-4" /> Activities
                        </h3>
                        <ul className="text-sm">
                          {selectedTrip.activities.map((activity, index) => (
                            <li key={index}>{activity}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Info */}
                  {showNavigation && route && routeDetails && (
                    <div className="mt-4 p-4 bg-base-200 rounded-lg">
                      <h3 className="text-lg font-bold mb-2">Trip Navigation</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="stat">
                          <div className="stat-figure text-primary">
                            <Route className="w-8 h-8" />
                          </div>
                          <div className="stat-title">Distance</div>
                          <div className="stat-value">{routeDetails.distance} km</div>
                        </div>
                        <div className="stat">
                          <div className="stat-figure text-primary">
                            <Clock className="w-8 h-8" />
                          </div>
                          <div className="stat-title">Estimated Time</div>
                          <div className="stat-value">{routeDetails.duration} min</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${currentLocation[0]},${currentLocation[1]}&destination=${selectedTrip.coordinates[0]},${selectedTrip.coordinates[1]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary w-full"
                        >
                          Open in Google Maps
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Update Expenses Section in Trip Details */}
                  <div className="card bg-base-100 shadow-xl mt-6">
                    <div className="card-body">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        Trip Expenses
                      </h3>

                      {tripExpenses.length > 0 ? (
                        <>
                          <div className="tabs tabs-boxed mb-4">
                            <button
                              className="tab tab-active"
                              onClick={() => {}} // No need for tab switching as we show all expenses
                            >
                              All Expenses (${totalTripExpenses.toFixed(2)})
                            </button>
                            <button
                              className="tab"
                              onClick={() => {}} // No need for tab switching
                            >
                              Personal (${personalExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)})
                            </button>
                            <button
                              className="tab"
                              onClick={() => {}} // No need for tab switching
                            >
                              Group (${groupExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)})
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="table w-full">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Title</th>
                                  <th>Category</th>
                                  <th>Amount</th>
                                  <th>Type</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tripExpenses.map(expense => (
                                  <tr key={expense._id} className="hover">
                                    <td>{new Date(expense.date).toLocaleDateString()}</td>
                                    <td>
                                      <div>
                                        <div className="font-bold">{expense.title}</div>
                                        {expense.description && (
                                          <div className="text-sm opacity-50">{expense.description}</div>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <span className="badge badge-ghost">{expense.category}</span>
                                    </td>
                                    <td className="font-semibold">${expense.amount.toFixed(2)}</td>
                                    <td>
                                      <span className={`badge ${expense.isGroupExpense ? 'badge-primary' : 'badge-secondary'}`}> 
                                        {expense.isGroupExpense ? 'Group' : 'Personal'}
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`badge ${
                                        expense.status === 'paid' ? 'badge-success' :
                                        expense.status === 'cancelled' ? 'badge-error' :
                                        'badge-warning'
                                      }`}>
                                        {expense.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan="3" className="text-right font-bold">Total Expenses:</td>
                                  <td colSpan="4" className="font-bold">${totalTripExpenses.toFixed(2)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Budget Progress */}
                          <div className="mt-4">
                            <div className="flex justify-between mb-2">
                              <span>Budget Usage</span>
                              <span>{((totalTripExpenses / selectedTrip.budget) * 100).toFixed(1)}%</span>
                            </div>
                            <progress 
                              className={`progress w-full ${
                                totalTripExpenses > selectedTrip.budget ? 'progress-error' :
                                totalTripExpenses > selectedTrip.budget * 0.8 ? 'progress-warning' :
                                'progress-success'
                              }`}
                              value={totalTripExpenses}
                              max={selectedTrip.budget}
                            ></progress>
                            {totalTripExpenses > selectedTrip.budget && (
                              <p className="text-error text-sm mt-1">
                                Budget exceeded by ${(totalTripExpenses - selectedTrip.budget).toFixed(2)}
                              </p>
                            )}
                          </div>

                          {/* Expense Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="card bg-base-200">
                              <div className="card-body">
                                <h4 className="card-title text-sm">Personal Expenses</h4>
                                <div className="text-2xl font-bold">
                                  ${personalExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {personalExpenses.length} expense{personalExpenses.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="card bg-base-200">
                              <div className="card-body">
                                <h4 className="card-title text-sm">Group Expenses</h4>
                                <div className="text-2xl font-bold">
                                  ${groupExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {groupExpenses.length} expense{groupExpenses.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          {selectedTrip.status === 'planning' ? (
                            <>
                              <p>No expenses added yet.</p>
                            </>
                          ) : (
                            <p>No expenses were added during the planning phase.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-actions justify-end mt-6">
                    <button 
                      className="btn btn-outline" 
                      onClick={() => setShowShareTripModal(true)}
                    >
                      Share Trip
                    </button>
                    <button 
                      className="btn btn-outline"
                      onClick={() => {
                        setEditFormData(selectedTrip);
                        setShowEditTripModal(true);
                      }}
                    >
                      Edit Trip
                    </button>
                    <button className="btn btn-primary">View Details</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Trip Modal */}
      {showNewTripModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg">Create New Trip</h3>
            <button
              onClick={() => setShowNewTripModal(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>
            
            <form onSubmit={handleCreateTrip} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="form-control">
                <label className="label">Trip Title</label>
                <input 
                  type="text" 
                  placeholder="Enter trip title" 
                  className="input input-bordered"
                  value={newTripForm.title}
                  onChange={(e) => setNewTripForm({ ...newTripForm, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">Location</label>
                <select 
                  className="select select-bordered w-full"
                  value={newTripForm.location}
                  onChange={(e) => {
                    const location = KATHMANDU_LOCATIONS.find(loc => loc.name === e.target.value);
                    if (location) {
                      setNewTripForm({
                        ...newTripForm,
                        location: location.name,
                        coordinates: location.coordinates
                      });
                    }
                  }}
                  required
                >
                  <option value="">Select a location in Kathmandu</option>
                  {KATHMANDU_LOCATIONS.map(location => (
                    <option key={location.name} value={location.name}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">Start Date</label>
                <input 
                  type="date" 
                  className="input input-bordered"
                  value={newTripForm.startDate}
                  onChange={(e) => setNewTripForm({ ...newTripForm, startDate: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">End Date</label>
                <input 
                  type="date" 
                  className="input input-bordered"
                  value={newTripForm.endDate}
                  onChange={(e) => setNewTripForm({ ...newTripForm, endDate: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">Budget</label>
                <input 
                  type="number" 
                  placeholder="Enter budget" 
                  className="input input-bordered"
                  value={newTripForm.budget}
                  onChange={(e) => setNewTripForm({ ...newTripForm, budget: Number(e.target.value) })}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">Select Group</label>
                <select 
                  className="select select-bordered w-full"
                  value={newTripForm.groupId}
                  onChange={(e) => setNewTripForm({ ...newTripForm, groupId: e.target.value })}
                  required
                >
                  <option value="">Select a group</option>
                  {groups.map(group => (
                    <option key={group._id} value={group._id}>
                      {group.name} ({group.members?.length || 0} members)
                    </option>
                  ))}
                </select>
              </div>

              {/* Show selected group members */}
              {selectedGroupMembers.length > 0 && (
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">Group Members</span>
                    <span className="label-text-alt">{selectedGroupMembers.length} members</span>
                  </label>
                  <div className="bg-base-200 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {selectedGroupMembers.map(member => (
                        <div 
                          key={member._id}
                          className="badge badge-primary gap-2"
                        >
                          <Users className="w-3 h-3" />
                          {member.username || member.email}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="form-control md:col-span-2">
                <label className="label">Description</label>
                <textarea 
                  className="textarea textarea-bordered h-24" 
                  placeholder="Enter trip description"
                  value={newTripForm.description}
                  onChange={(e) => setNewTripForm({ ...newTripForm, description: e.target.value })}
                ></textarea>
              </div>

              <div className="form-control md:col-span-2">
                <label className="label">Activities (comma-separated)</label>
                <input 
                  type="text" 
                  className="input input-bordered"
                  placeholder="e.g. Hiking, Swimming, Sightseeing"
                  value={newTripForm.activities.join(', ')}
                  onChange={(e) => setNewTripForm({ 
                    ...newTripForm, 
                    activities: e.target.value.split(',').map(activity => activity.trim())
                  })}
                />
              </div>

              <div className="form-control">
                <label className="label">Transportation</label>
                <input 
                  type="text" 
                  className="input input-bordered"
                  placeholder="e.g. Air France"
                  value={newTripForm.transportation}
                  onChange={(e) => setNewTripForm({ ...newTripForm, transportation: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label">Accommodation</label>
                <input 
                  type="text" 
                  className="input input-bordered"
                  placeholder="e.g. Hotel Name"
                  value={newTripForm.accommodation}
                  onChange={(e) => setNewTripForm({ ...newTripForm, accommodation: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label">Image URL</label>
                <input 
                  type="url" 
                  className="input input-bordered"
                  placeholder="Enter image URL (optional)"
                  value={newTripForm.image}
                  onChange={(e) => setNewTripForm({ ...newTripForm, image: e.target.value })}
                />
                <label className="label">
                  <span className="label-text-alt text-gray-500">Leave empty to use default image</span>
                </label>
              </div>
            </form>

            <div className="modal-action">
              <button className="btn" onClick={() => {
                setShowNewTripModal(false);
                setSelectedGroupMembers([]);
              }}>
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleCreateTrip}
                className="btn btn-primary"
                disabled={isTripSubmitting || !newTripForm.groupId}
              >
                {isTripSubmitting ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  'Create Trip'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Share Trip Modal */}
      {showShareTripModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Share Trip</h3>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Make Public</span>
                <input 
                  type="checkbox" 
                  className="toggle"
                  checked={editFormData.isPublic}
                  onChange={(e) => setEditFormData({...editFormData, isPublic: e.target.checked})}
                />
              </label>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setShowShareTripModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleShareTrip({ isPublic: editFormData.isPublic })}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Edit Trip Modal */}
      {showEditTripModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Edit Trip</h3>
            <form onSubmit={handleEditTrip} className="space-y-4">
              <div className="form-control">
                <label className="label">Title</label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                />
              </div>
              <div className="form-control">
                <label className="label">Description</label>
                <textarea
                  className="textarea textarea-bordered"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                />
              </div>
              <div className="form-control">
                <label className="label">Location</label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={editFormData.startDate?.split('T')[0]}
                    onChange={(e) => setEditFormData({...editFormData, startDate: e.target.value})}
                  />
                </div>
                <div className="form-control">
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={editFormData.endDate?.split('T')[0]}
                    onChange={(e) => setEditFormData({...editFormData, endDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-control">
                <label className="label">Budget</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={editFormData.budget}
                  onChange={(e) => setEditFormData({...editFormData, budget: Number(e.target.value)})}
                />
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setShowEditTripModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Add Note</h3>
            <div className="form-control mt-4">
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="Enter your note about this location..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              ></textarea>
            </div>
            <div className="modal-action">
              <button 
                className="btn" 
                onClick={() => {
                  setShowNoteModal(false);
                  setNewNote('');
                  setTempMarkerPosition(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleAddNote}
              >
                Add Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPage;