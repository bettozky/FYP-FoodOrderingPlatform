/** A review as the backend sends it to customers (never contains moderation notes or user ids). */
export type ReviewItem = {
  id: string;
  dishId: string;
  dishName?: string;
  merchantId?: string;
  merchantName?: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: number;
  editedAt?: number;
  reply?: { text: string; at: number };
  orderId?: string; // only on "my reviews"
  hidden?: boolean; // only on "my reviews": removed by an admin
};

export type PendingItem = { orderId: string; dishId: string; dishName: string; image?: string; merchantId: string; merchantName: string; orderedAt: number };

export type Breakdown = { stars: number; count: number }[];
