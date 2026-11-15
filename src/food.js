// What the counters sell. The street scene spends the money and restores the
// hunger; the HUD shows the same list in its shop panel.
//
// Every food cart has its own menu: the noodle stall sells noodles, the dumpling
// shop dumplings, the skewer cart skewers. Nothing is bought at a stall that
// does not make it.

export const FOODS = [
  // 便利店
  {
    id: 'bread',
    name: '隔夜面包',
    price: 4,
    restore: 28,
    energy: 12,
    icon: 'sandwich',
    blurb: '打折的，还能吃'
  },
  {
    id: 'meal',
    name: '便利店盒饭',
    price: 9,
    restore: 62,
    energy: 40,
    icon: 'utensils',
    blurb: '微波炉转热的那种'
  },
  {
    id: 'water',
    name: '矿泉水',
    price: 2,
    restore: 12,
    energy: 8,
    icon: 'cup-soda',
    blurb: '灌个水饱'
  },
  {
    id: 'baozi',
    name: '肉包',
    price: 3,
    restore: 24,
    energy: 10,
    icon: 'sandwich',
    blurb: '刚出笼，烫手'
  },
  {
    id: 'teaegg',
    name: '茶蛋',
    price: 2,
    restore: 12,
    energy: 6,
    icon: 'cup-soda',
    blurb: '在锅里煨了一整天'
  },

  // 兰州拉面
  {
    id: 'noodle',
    name: '牛肉面',
    price: 6,
    restore: 44,
    energy: 24,
    icon: 'utensils',
    blurb: '一清二白三红四绿，热腾腾一大碗'
  },
  {
    id: 'coldnoodle',
    name: '凉皮',
    price: 4,
    restore: 30,
    energy: 10,
    icon: 'utensils',
    blurb: '辣子一浇，天热也能吃一碗'
  },

  // 沙县小吃
  {
    id: 'dumpling',
    name: '蒸饺',
    price: 5,
    restore: 26,
    energy: 10,
    icon: 'sandwich',
    blurb: '皮薄馅大，一屉八个'
  },
  {
    id: 'mixnoodle',
    name: '拌面',
    price: 6,
    restore: 38,
    energy: 16,
    icon: 'utensils',
    blurb: '花生酱拌的，干香'
  },
  {
    id: 'soup',
    name: '炖罐汤',
    price: 7,
    restore: 30,
    energy: 18,
    icon: 'cup-soda',
    blurb: '小罐子里煨了半天'
  },

  // 烧烤摊
  {
    id: 'skewer',
    name: '烤串',
    price: 3,
    restore: 18,
    energy: 8,
    icon: 'utensils',
    blurb: '一串，孜然撒得厚'
  },
  {
    id: 'eggplant',
    name: '烤茄子',
    price: 6,
    restore: 30,
    energy: 10,
    icon: 'utensils',
    blurb: '剖开铺蒜蓉，油汪汪的'
  },
  {
    id: 'bunslice',
    name: '烤馒头片',
    price: 2,
    restore: 16,
    energy: 6,
    icon: 'sandwich',
    blurb: '刷了酱，边儿焦'
  },

  // 盒饭
  {
    id: 'boxlunch',
    name: '盒饭',
    price: 9,
    restore: 58,
    energy: 32,
    icon: 'utensils',
    blurb: '一荤两素，菜码随便加'
  },
  {
    id: 'hotdog',
    name: '热狗',
    price: 5,
    restore: 30,
    energy: 14,
    icon: 'sandwich',
    blurb: '面包一夹，挤一溜黄芥末'
  },

  // 麻辣烫
  {
    id: 'malatang',
    name: '麻辣烫',
    price: 8,
    restore: 55,
    energy: 26,
    icon: 'utensils',
    blurb: '一锅汤底从早滚到晚'
  },
  {
    id: 'bingfen',
    name: '冰粉',
    price: 3,
    restore: 12,
    energy: 6,
    icon: 'cup-soda',
    blurb: '红糖水一浇，解辣'
  },

  // 煎饼摊
  {
    id: 'jianbing',
    name: '煎饼',
    price: 6,
    restore: 40,
    energy: 18,
    icon: 'sandwich',
    blurb: '薄脆现炸，卷起来还烫手'
  },
  {
    id: 'soymilk',
    name: '豆浆',
    price: 2,
    restore: 14,
    energy: 8,
    icon: 'cup-soda',
    blurb: '塑料袋装着，插根吸管'
  },

  // 奶茶
  {
    id: 'milktea',
    name: '奶茶',
    price: 6,
    restore: 20,
    energy: 12,
    icon: 'cup-soda',
    blurb: '半糖去冰，店员这么问的'
  },
  {
    id: 'bubbletea',
    name: '珍珠奶茶',
    price: 8,
    restore: 24,
    energy: 14,
    icon: 'cup-soda',
    blurb: '底下沉着一层珍珠'
  },
  {
    id: 'lemonade',
    name: '柠檬水',
    price: 4,
    restore: 12,
    energy: 8,
    icon: 'cup-soda',
    blurb: '冰块还没化'
  }
];

export function foodById(id) {
  return FOODS.find((f) => f.id === id) || null;
}
