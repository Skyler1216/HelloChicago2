import { Post, Category, PopularSpot } from '../types';

export const categories: Category[] = [
  {
    id: 'hospital',
    name: 'Hospital',
    nameJa: '病院',
    icon: 'Heart',
    color: '#FF6B6B'
  },
  {
    id: 'beauty',
    name: 'Beauty',
    nameJa: '美容院',
    icon: 'Scissors',
    color: '#4ECDC4'
  },
  {
    id: 'shopping',
    name: 'Shopping',
    nameJa: '買い物',
    icon: 'ShoppingBag',
    color: '#FFE66D'
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    nameJa: 'レストラン',
    icon: 'UtensilsCrossed',
    color: '#95E1D3'
  },
  {
    id: 'kids',
    name: 'Kids',
    nameJa: '子ども',
    icon: 'Baby',
    color: '#F38BA8'
  },
  {
    id: 'park',
    name: 'Park',
    nameJa: '公園',
    icon: 'Trees',
    color: '#A8E6CF'
  }
];

export const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Northwestern Memorial Hospitalで出産体験',
    content: 'シカゴの Northwestern Memorial Hospital で出産しました。日本語通訳サービスもあり、スタッフもとても親切でした。設備も整っていて安心して出産できました。駐車場は有料ですが、入院中は割引があります。',
    summary: 'Northwestern Memorial Hospitalでの出産体験。日本語通訳あり、設備充実、スタッフ親切。駐車場有料だが入院中割引あり。',
    type: 'post',
    category: categories[0],
    location: {
      lat: 41.8955,
      lng: -87.6217,
      address: '251 E Huron St, Chicago, IL 60611'
    },
    images: ['https://images.pexels.com/photos/236380/pexels-photo-236380.jpeg'],
    author: {
      id: 'user1',
      name: '佐藤美咲'
    },
    createdAt: new Date('2024-01-15'),
    likes: 12,
    replies: 3,
    approved: true
  },
  {
    id: '2',
    title: 'Whole Foods Marketでの買い物のコツ',
    content: 'リンカーンパークのWhole Foods Marketは品揃えが良く、オーガニック商品も豊富です。日本の調味料コーナーもあります。Prime会員だと割引もあるのでおすすめです。',
    summary: 'リンカーンパークのWhole Foods Market。品揃え良し、オーガニック豊富、日本調味料あり。Prime会員割引あり。',
    type: 'post',
    category: categories[2],
    location: {
      lat: 41.9033,
      lng: -87.6367,
      address: '1550 N Kingsbury St, Chicago, IL 60642'
    },
    images: ['https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg'],
    author: {
      id: 'user2',
      name: '田中花子'
    },
    createdAt: new Date('2024-01-20'),
    likes: 8,
    replies: 5,
    approved: true
  },
  {
    id: '3',
    title: 'Alinea - 特別な日のディナー',
    content: 'シカゴの有名レストランAlineaで記念日ディナー。3つ星ミシュランの革新的な料理に感動しました。予約は早めがおすすめ。ドレスコードはスマートカジュアル以上です。',
    summary: 'Alineaでの記念日ディナー。3つ星ミシュラン、革新的料理。早めの予約必要、スマートカジュアル以上のドレスコード。',
    type: 'post',
    category: categories[3],
    location: {
      lat: 41.9007,
      lng: -87.6340,
      address: '1723 N Halsted St, Chicago, IL 60614'
    },
    images: ['https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg'],
    author: {
      id: 'user3',
      name: '山田直子'
    },
    createdAt: new Date('2024-01-25'),
    likes: 15,
    replies: 8,
    approved: true
  },
  {
    id: '4',
    title: '土曜夜に品川区で婚姻届を出したい',
    content: '品川区で土曜日でも24時間婚姻届を出せるのは本庁のみでしょうか？インターネットで調べてもよく分からず、ご存じの方おられたら教えてください。',
    type: 'consultation',
    status: 'in_progress',
    category: categories[0],
    location: {
      lat: 41.8781,
      lng: -87.6298,
      address: 'Chicago City Hall, 121 N LaSalle St, Chicago, IL 60602'
    },
    images: [],
    author: {
      id: 'user4',
      name: '鈴木恵子'
    },
    createdAt: new Date('2024-01-28'),
    likes: 2,
    replies: 4,
    approved: true
  },
  {
    id: '5',
    title: 'ベビーゲートいただけませんか？',
    content: '引っ越しに伴い階段があるお家のため、ベビーゲートが必要になりました。ベビーゲートをもう卒業されたお宅がありましたら、譲っていただけませんでしょうか。',
    type: 'transfer',
    status: 'open',
    category: categories[4],
    location: {
      lat: 41.9212,
      lng: -87.6324,
      address: 'Lincoln Park, Chicago, IL'
    },
    images: [],
    author: {
      id: 'user5',
      name: '高橋由美'
    },
    createdAt: new Date('2024-01-30'),
    likes: 1,
    replies: 2,
    approved: true
  }
];

export const popularSpots: PopularSpot[] = [
  {
    id: 'spot1',
    name: 'Northwestern Memorial Hospital',
    category: categories[0],
    location: {
      lat: 41.8955,
      lng: -87.6217,
      address: '251 E Huron St, Chicago, IL 60611'
    },
    postCount: 5,
    averageRating: 4.8
  },
  {
    id: 'spot2',
    name: 'Whole Foods Market Lincoln Park',
    category: categories[2],
    location: {
      lat: 41.9033,
      lng: -87.6367,
      address: '1550 N Kingsbury St, Chicago, IL 60642'
    },
    postCount: 8,
    averageRating: 4.5
  },
  {
    id: 'spot3',
    name: 'Lincoln Park Zoo',
    category: categories[4],
    location: {
      lat: 41.9212,
      lng: -87.6324,
      address: '2001 N Clark St, Chicago, IL 60614'
    },
    postCount: 12,
    averageRating: 4.7
  }
];