import { 
  Utensils, 
  Hotel, 
  Bus, 
  Plane, 
  Coffee, 
  ShoppingBag, 
  Ticket, 
  Camera,
  Music,
  Wine,
  Home,
  Car
} from 'lucide-react';

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: Utensils, color: 'text-orange-500' },
  { id: 'accommodation', label: 'Accommodation', icon: Hotel, color: 'text-blue-500' },
  { id: 'transportation', label: 'Transportation', icon: Bus, color: 'text-green-500' },
  { id: 'flight', label: 'Flights', icon: Plane, color: 'text-purple-500' },
  { id: 'activities', label: 'Activities', icon: Ticket, color: 'text-yellow-500' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'text-pink-500' },
  { id: 'cafe', label: 'Cafe & Snacks', icon: Coffee, color: 'text-brown-500' },
  { id: 'sightseeing', label: 'Sightseeing', icon: Camera, color: 'text-indigo-500' },
  { id: 'entertainment', label: 'Entertainment', icon: Music, color: 'text-red-500' },
  { id: 'nightlife', label: 'Nightlife', icon: Wine, color: 'text-purple-500' },
  { id: 'rental', label: 'Rental', icon: Home, color: 'text-teal-500' },
  { id: 'taxi', label: 'Taxi & Cab', icon: Car, color: 'text-gray-500' },
  { id: 'other', label: 'Other', icon: ShoppingBag, color: 'text-gray-400' }
];

export const getExpenseCategory = (categoryId) => {
  return EXPENSE_CATEGORIES.find(cat => cat.id === categoryId) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}; 