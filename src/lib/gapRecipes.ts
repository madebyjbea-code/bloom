// ============================================================================
// lib/gapRecipes.ts   →   src/lib/gapRecipes.ts
//
// "Recipes that close the most gaps": when a vitamin or mineral store drops
// below 50 %, rank recipes by how many of those low nutrients one dish
// covers, and show which ingredient does which job.
//
// FOOD_SOURCES lists foods that give roughly ≥ 20 % of the Daily Value per
// typical serving (a "good source"). A leading "~" marks a partial source
// (~10–20 %), e.g. eggs for vitamin D. Values follow USDA FoodData Central.
// ============================================================================

export const FOOD_SOURCES: [RegExp, string[]][] = [
  [/\bkale\b/, ['vit_k', 'vit_c', 'vit_a', 'manganese']],
  [/spinach/, ['vit_k', 'folate', 'vit_a', 'magnesium', 'manganese', '~iron']],
  [/broccoli/, ['vit_c', 'vit_k', 'folate']],
  [/brussels/, ['vit_k', 'vit_c', 'folate']],
  [/(red|yellow|bell) pepper|peppers/, ['vit_c', 'vit_a', 'vit_b6']],
  [/\borange|mandarin|clementine/, ['vit_c']],
  [/strawberr/, ['vit_c', 'manganese']],
  [/kiwi/, ['vit_c', 'vit_k']],
  [/red cabbage|cabbage/, ['vit_c', 'vit_k']],
  [/tomato/, ['vit_c', '~vit_k']],
  [/\bpeas\b/, ['vit_k', 'vit_c', 'thiamin', 'manganese']],
  [/asparagus/, ['folate', 'vit_k']],
  [/beetroot|\bbeets?\b/, ['folate', 'manganese']],
  [/avocado/, ['folate', 'vit_k', 'vit_b5', 'copper', '~vit_e', '~potassium']],
  [/lentil/, ['folate', 'iron', 'thiamin', 'manganese', 'copper', 'phosphorus']],
  [/chickpea/, ['folate', 'manganese', 'copper', 'iron', 'phosphorus']],
  [/black bean|kidney bean|cannellini|white bean|butter bean/, ['folate', 'magnesium', 'manganese', 'thiamin', '~iron']],
  [/edamame/, ['folate', 'vit_k', 'manganese', 'iron', 'magnesium']],
  [/tofu/, ['calcium', 'manganese', 'selenium', 'iron', 'copper']],
  [/salmon/, ['vit_d', 'vit_b12', 'selenium', 'niacin', 'vit_b6', 'phosphorus']],
  [/mackerel/, ['vit_d', 'vit_b12', 'selenium', 'niacin']],
  [/sardine/, ['vit_d', 'vit_b12', 'calcium', 'selenium', 'phosphorus']],
  [/herring/, ['vit_d', 'vit_b12', 'selenium']],
  [/tuna/, ['niacin', 'selenium', 'vit_b12', '~vit_d']],
  [/\bcod\b|haddock|white fish|pollock|hake/, ['iodine', 'selenium', 'vit_b12', 'phosphorus']],
  [/prawn|shrimp|mussel/, ['selenium', 'vit_b12', 'iodine', 'zinc', 'copper']],
  [/\beggs?\b/, ['vit_b12', 'selenium', 'riboflavin', '~vit_d', '~vit_b5']],
  [/chicken/, ['niacin', 'vit_b6', 'selenium', 'phosphorus']],
  [/beef|steak|mince/, ['vit_b12', 'zinc', 'selenium', 'niacin', '~iron']],
  [/mushroom/, ['riboflavin', 'niacin', 'copper', '~vit_d', '~vit_b5']],
  [/greek yog|yogh?urt|skyr|kefir/, ['calcium', 'vit_b12', 'riboflavin', 'phosphorus', '~iodine']],
  [/\bmilk\b/, ['calcium', 'riboflavin', 'vit_b12', 'phosphorus', '~iodine']],
  [/cheddar|cheese|feta|parmesan/, ['calcium', 'phosphorus', '~vit_b12']],
  [/sweet potato/, ['vit_a', 'manganese', 'vit_b6', 'vit_c', '~potassium']],
  [/carrot/, ['vit_a', '~vit_k']],
  [/pumpkin(?! seed)|squash/, ['vit_a', '~vit_c']],
  [/\bpotato/, ['vit_c', 'vit_b6', '~potassium']],
  [/banana/, ['vit_b6']],
  [/almond/, ['vit_e', 'magnesium', 'riboflavin', 'manganese']],
  [/sunflower seed/, ['vit_e', 'selenium', 'thiamin', 'copper', 'manganese']],
  [/pumpkin seed|pepita/, ['magnesium', 'zinc', 'manganese', 'phosphorus', 'copper', 'iron']],
  [/chia/, ['manganese', 'magnesium', 'phosphorus', '~calcium']],
  [/brazil nut/, ['selenium']],
  [/cashew/, ['copper', 'magnesium', 'manganese']],
  [/walnut/, ['manganese', 'copper']],
  [/sesame|tahini/, ['copper', 'manganese', '~calcium']],
  [/\boats?\b|porridge/, ['manganese', 'thiamin', 'phosphorus', 'magnesium']],
  [/quinoa/, ['manganese', 'magnesium', 'folate', 'phosphorus', 'copper']],
  [/bread|sourdough/, ['manganese', '~iodine', '~thiamin']], // NL bread uses iodised baker's salt
  [/seaweed|nori|wakame/, ['iodine']],
  [/dark chocolate|cacao/, ['copper', 'manganese', 'iron', 'magnesium']],
  [/parsley/, ['vit_k', 'vit_c']],
  [/lemon|lime/, ['~vit_c']],
];

export function sourcesFor(ingredient: string): { key: string; partial: boolean }[] {
  const s = ingredient.toLowerCase();
  const found = FOOD_SOURCES.find(([re]) => re.test(s));
  return found ? found[1].map((k) => ({ key: k.replace('~', ''), partial: k.startsWith('~') })) : [];
}

export type GapRecipe = {
  id: string;
  name: string;
  minutes: number;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  source: 'bloom' | 'notion';
  notion_url?: string | null;
};

// Built-in starter recipes (2 servings) so suggestions work even before the
// Notion recipe book is synced. Coverage is computed from the ingredients,
// never hand-labelled, so it stays honest.
export const BUILTIN_RECIPES: GapRecipe[] = [
  { id: 'b-kale-lentil-mackerel', name: 'Kale, roast pumpkin & lentil salad with smoked mackerel', minutes: 30, source: 'bloom',
    ingredients: [{ name: 'Pumpkin', amount: '300 g, cubed' }, { name: 'Kale', amount: '2 big handfuls' }, { name: 'Cooked lentils', amount: '1 tin (240 g drained)' }, { name: 'Smoked mackerel', amount: '2 fillets' }, { name: 'Pumpkin seeds', amount: '2 tbsp' }, { name: 'Olive oil', amount: '2 tbsp' }, { name: 'Lemon', amount: '½' }],
    steps: ['Roast the pumpkin with 1 tbsp oil at 200 °C for 25 min.', 'Massage the kale with the rest of the oil, lemon juice and a pinch of salt.', 'Toss with lentils and pumpkin, flake the mackerel on top, finish with seeds.'] },
  { id: 'b-shakshuka', name: 'Red pepper & chickpea shakshuka', minutes: 30, source: 'bloom',
    ingredients: [{ name: 'Onion', amount: '1' }, { name: 'Red peppers', amount: '2, sliced' }, { name: 'Chopped tomatoes', amount: '1 tin' }, { name: 'Chickpeas', amount: '1 tin, drained' }, { name: 'Spinach', amount: '2 handfuls' }, { name: 'Eggs', amount: '4' }, { name: 'Cumin & paprika', amount: '1 tsp each' }],
    steps: ['Soften onion and peppers in oil for 8 min, add spices.', 'Add tomatoes and chickpeas, simmer 10 min, stir in spinach.', 'Make 4 wells, crack in the eggs, cover and cook 6–8 min.'] },
  { id: 'b-miso-bowl', name: 'Broccoli, edamame & orange miso bowl', minutes: 20, source: 'bloom',
    ingredients: [{ name: 'Quinoa', amount: '150 g' }, { name: 'Broccoli', amount: '1 small head' }, { name: 'Edamame', amount: '150 g' }, { name: 'Orange', amount: '1, segmented' }, { name: 'Tofu', amount: '200 g, cubed' }, { name: 'Miso', amount: '1 tbsp' }, { name: 'Sesame seeds', amount: '1 tbsp' }],
    steps: ['Cook quinoa. Steam broccoli and edamame for 4 min.', 'Pan-fry tofu until golden.', 'Whisk miso with orange juice and a splash of water; pour over everything, top with orange and sesame.'] },
  { id: 'b-salmon-traybake', name: 'Salmon, sweet potato & greens tray bake', minutes: 35, source: 'bloom',
    ingredients: [{ name: 'Salmon', amount: '2 fillets' }, { name: 'Sweet potato', amount: '2 medium, cubed' }, { name: 'Broccoli', amount: '1 head' }, { name: 'Red pepper', amount: '1' }, { name: 'Olive oil', amount: '2 tbsp' }, { name: 'Lemon', amount: '½' }],
    steps: ['Roast sweet potato with oil at 200 °C for 15 min.', 'Add broccoli, pepper and salmon; roast 12–15 min more.', 'Squeeze lemon over to serve.'] },
  { id: 'b-sardine-toast', name: 'Sardine & white bean toast with tomatoes', minutes: 10, source: 'bloom',
    ingredients: [{ name: 'Sourdough', amount: '2 slices' }, { name: 'Sardines', amount: '1 tin' }, { name: 'Cannellini beans', amount: '½ tin' }, { name: 'Tomatoes', amount: '2, chopped' }, { name: 'Parsley', amount: 'a handful' }, { name: 'Lemon', amount: '½' }],
    steps: ['Toast the bread.', 'Lightly mash beans with lemon, olive oil and parsley.', 'Pile beans, sardines and tomatoes on the toast.'] },
  { id: 'b-omelette', name: 'Spinach, mushroom & feta omelette', minutes: 12, source: 'bloom',
    ingredients: [{ name: 'Eggs', amount: '3' }, { name: 'Mushrooms', amount: '100 g, sliced' }, { name: 'Spinach', amount: '2 handfuls' }, { name: 'Feta', amount: '30 g' }],
    steps: ['Fry mushrooms until golden, wilt in spinach.', 'Pour over beaten eggs, cook gently, add feta and fold.'] },
  { id: 'b-overnight-oats', name: 'Overnight oats with yoghurt, kiwi & pumpkin seeds', minutes: 5, source: 'bloom',
    ingredients: [{ name: 'Oats', amount: '50 g' }, { name: 'Greek yoghurt', amount: '100 g' }, { name: 'Milk', amount: '100 ml' }, { name: 'Chia seeds', amount: '1 tbsp' }, { name: 'Kiwi', amount: '1' }, { name: 'Pumpkin seeds', amount: '1 tbsp' }],
    steps: ['Stir oats, yoghurt, milk and chia together; chill overnight.', 'Top with sliced kiwi and pumpkin seeds.'] },
  { id: 'b-bean-tacos', name: 'Black bean, avocado & red pepper tacos', minutes: 20, source: 'bloom',
    ingredients: [{ name: 'Black beans', amount: '1 tin' }, { name: 'Avocado', amount: '1' }, { name: 'Red pepper', amount: '1, sliced' }, { name: 'Red cabbage', amount: '1 cup, shredded' }, { name: 'Corn tortillas', amount: '6' }, { name: 'Lime', amount: '1' }],
    steps: ['Warm beans with cumin and a splash of water, lightly mash.', 'Char the pepper in a hot pan.', 'Fill tortillas with beans, pepper, cabbage and avocado; squeeze lime over.'] },
  { id: 'b-dal', name: 'Red lentil & sweet potato dal with spinach', minutes: 30, source: 'bloom',
    ingredients: [{ name: 'Red lentils', amount: '150 g' }, { name: 'Sweet potato', amount: '1, cubed' }, { name: 'Chopped tomatoes', amount: '1 tin' }, { name: 'Spinach', amount: '2 handfuls' }, { name: 'Onion', amount: '1' }, { name: 'Turmeric, cumin, ginger', amount: '1 tsp each' }, { name: 'Greek yoghurt', amount: 'to serve' }],
    steps: ['Soften onion with the spices.', 'Add lentils, sweet potato, tomatoes and 600 ml water; simmer 20 min.', 'Stir in spinach, serve with a spoon of yoghurt.'] },
  { id: 'b-cod-peas', name: 'Cod with peas, new potatoes & parsley', minutes: 25, source: 'bloom',
    ingredients: [{ name: 'Cod', amount: '2 fillets' }, { name: 'New potatoes', amount: '400 g' }, { name: 'Peas', amount: '200 g' }, { name: 'Parsley', amount: 'a handful' }, { name: 'Lemon', amount: '½' }, { name: 'Butter', amount: '1 tbsp' }],
    steps: ['Boil potatoes 15 min, adding peas for the last 3.', 'Pan-fry cod 3–4 min per side.', 'Crush potatoes and peas with butter, parsley and lemon.'] },
  { id: 'b-tofu-stirfry', name: 'Tofu, cashew & Brussels sprout stir-fry', minutes: 20, source: 'bloom',
    ingredients: [{ name: 'Tofu', amount: '200 g' }, { name: 'Brussels sprouts', amount: '200 g, halved' }, { name: 'Red pepper', amount: '1' }, { name: 'Cashews', amount: 'a handful' }, { name: 'Noodles', amount: '150 g' }, { name: 'Ginger & garlic', amount: '1 tsp each' }, { name: 'Soy sauce', amount: '1 tbsp' }],
    steps: ['Fry tofu until crisp; set aside.', 'Stir-fry sprouts and pepper with ginger and garlic 5 min.', 'Toss in noodles, tofu, cashews and soy sauce.'] },
  { id: 'b-chilli', name: 'Beef & bean chilli with peppers', minutes: 40, source: 'bloom',
    ingredients: [{ name: 'Lean beef mince', amount: '250 g' }, { name: 'Kidney beans', amount: '1 tin' }, { name: 'Red peppers', amount: '2' }, { name: 'Chopped tomatoes', amount: '1 tin' }, { name: 'Onion', amount: '1' }, { name: 'Dark chocolate', amount: '1 square' }],
    steps: ['Brown mince with onion and peppers.', 'Add beans, tomatoes, spices and chocolate; simmer 25 min.'] },
];

export type RankedRecipe = {
  recipe: GapRecipe;
  covers: { key: string; via: string; partial: boolean }[];
  score: number;
  inSeason: boolean;
};

export function rankRecipesForGaps(
  gapKeys: string[],
  notionRecipes: any[] = [],
  inSeasonNames: string[] = [],
  limit = 3,
): RankedRecipe[] {
  if (!gapKeys.length) return [];
  const season = inSeasonNames.map((n) => n.toLowerCase());
  const fromNotion: GapRecipe[] = notionRecipes.map((r) => ({
    id: `n-${r.id}`,
    name: r.name,
    minutes: r.cook_time_minutes || 0,
    source: 'notion',
    notion_url: r.notion_url,
    ingredients: (r.ingredient_amounts?.length ? r.ingredient_amounts : (r.ingredient_names || []).map((n: string) => ({ name: n, amount: '' })))
      .map((i: any) => ({ name: i.name || String(i), amount: i.amount || '' })),
    steps: r.instructions ? String(r.instructions).split(/\n+/).filter(Boolean) : [],
  }));

  const ranked = [...fromNotion, ...BUILTIN_RECIPES].map((recipe) => {
    const covers: RankedRecipe['covers'] = [];
    for (const gap of gapKeys) {
      let best: { via: string; partial: boolean } | null = null;
      for (const ing of recipe.ingredients) {
        const hit = sourcesFor(ing.name).find((s) => s.key === gap);
        if (hit && (!best || (best.partial && !hit.partial))) best = { via: ing.name, partial: hit.partial };
      }
      if (best) covers.push({ key: gap, ...best });
    }
    const inSeason = recipe.ingredients.some((i) => season.some((s) => i.name.toLowerCase().includes(s)));
    const score = covers.reduce((a, c) => a + (c.partial ? 0.5 : 1), 0) + (inSeason ? 0.25 : 0) + (recipe.source === 'notion' ? 0.1 : 0);
    return { recipe, covers, score, inSeason };
  });

  return ranked
    .filter((r) => r.covers.length > 0)
    .sort((a, b) => b.score - a.score || (a.recipe.minutes || 99) - (b.recipe.minutes || 99))
    .slice(0, limit);
}
