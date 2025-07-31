/*
  # Populate categories table with initial data

  1. Categories
    - hospital: 病院 (Heart icon, coral color)
    - beauty: 美容院 (Scissors icon, teal color)
    - shopping: 買い物 (ShoppingBag icon, yellow color)
    - restaurant: レストラン (UtensilsCrossed icon, green color)
    - kids: 子ども (Baby icon, pink color)
    - park: 公園 (Trees icon, green color)
*/

INSERT INTO categories (id, name, name_ja, icon, color) VALUES
  ('hospital', 'Hospital', '病院', 'Heart', '#FF6B6B'),
  ('beauty', 'Beauty', '美容院', 'Scissors', '#4ECDC4'),
  ('shopping', 'Shopping', '買い物', 'ShoppingBag', '#FFE66D'),
  ('restaurant', 'Restaurant', 'レストラン', 'UtensilsCrossed', '#95E1D3'),
  ('kids', 'Kids', '子ども', 'Baby', '#F38BA8'),
  ('park', 'Park', '公園', 'Trees', '#A8E6CF')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ja = EXCLUDED.name_ja,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;