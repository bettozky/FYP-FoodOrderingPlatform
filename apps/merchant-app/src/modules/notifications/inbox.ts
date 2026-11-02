// Order and table requests already have their own full-screen pop-up and queue, so they are left out of the
// Notifications page and its badge. Everything else (new applicants, reviews, notices from ScootMeal) is shown there.
const HANDLED_ELSEWHERE = /^(new_order|order_|partial_ok|new_reservation|reservation_|preorder_|out_of_stock|food_ready|handed_over|refund)/;
export const isInboxType = (type: string) => !HANDLED_ELSEWHERE.test(type);
