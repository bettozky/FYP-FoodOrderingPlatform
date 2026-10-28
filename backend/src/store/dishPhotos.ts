// Stand-in photos for the demo menu, until merchants can upload their own (needs the real database and file storage).
// Each one is a free-licence picture from Wikimedia Commons. The author and licence are on the file's Commons page,
// listed in backend/public/dishes/CREDITS.md. To use a different picture for a dish, drop a file named <dish id>.jpg
// into backend/public/dishes/ (it is never overwritten once it exists).
export const DISH_PHOTO_FILES: Record<string, string> = {
  d1: "Taiwanese_Beef_Noodle_Soup.jpg", // Beef Noodle Soup
  d2: "Halal_wanton_mee.jpg", // Dry Wantan Mee
  d11: "Vegetable_udon_noodle_soup.jpg", // Vegetable Noodle Soup
  d3: "Nasi_Lemak_from_Mamak.jpg", // Nasi Lemak Ayam Goreng
  d4: "Nasi_Rendang.JPG", // Beef Rendang Rice
  d12: "Nasi_lemak_basic.jpg", // Nasi Lemak Sayur
  d5: "Kwetiau_Siram.jpg", // Beef Hor Fun
  d6: "Sweet_and_sour_chicken_5.jpg", // Sweet & Sour Chicken
  d13: "Mushroom_fried_rice,_Loving_Hut,_Yogyakarta.jpg", // Vegetable Fried Rice
  d7: "Beef_curry_rice_003.jpg", // Beef Curry with Rice
  d8: "Special_chicken_biryani.JPG", // Chicken Briyani
  d14: "Roti_canai_with_dal_in_Kuala_Lumpur,_July_2014.jpg", // Dhal Curry & Roti
  d9: "Pearl_Milk_Tea_in_Chun_Shui_Tang.jpg", // Brown Sugar Boba Milk
  d10: "Iced_lemon_tea.jpg", // Iced Lemon Tea
  d15: "Matcha_latte.jpg", // Matcha Oat Latte
};
