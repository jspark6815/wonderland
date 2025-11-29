export interface Place {
  id: string;
  name: string;
  category?: string;
  address: string;
  roadAddress?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  distance?: number;
  isOpen?: boolean;
  businessHours?: BusinessHours;
  images?: string[];
  tags?: string[];
  priceRange?: PriceRange;
}

export interface BusinessHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface SearchFilters {
  categories?: string[];
  radius?: number;
  priceRange?: PriceRange;
  isOpen?: boolean;
  rating?: number;
  sortBy?: 'distance' | 'rating' | 'reviewCount';
}

export interface Coordinates {
  lat: number;
  lng: number;
}
