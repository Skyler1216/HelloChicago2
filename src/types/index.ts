export interface Post {
  id: string;
  title: string;
  content: string;
  summary?: string;
  type: 'post' | 'consultation' | 'transfer';
  status?: 'open' | 'in_progress' | 'closed';
  category: Category;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  likes: number;
  replies?: number;
  approved: boolean;
}

export interface Category {
  id: string;
  name: string;
  nameJa: string;
  icon: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isApproved: boolean;
  role: 'user' | 'admin';
}

export interface PopularSpot {
  id: string;
  name: string;
  category: Category;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  postCount: number;
  averageRating: number;
}
