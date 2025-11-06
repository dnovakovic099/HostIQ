// Room type suggestions and helpful tips for property setup

export const ROOM_TYPES = {
  BEDROOM: 'bedroom',
  BATHROOM: 'bathroom',
  KITCHEN: 'kitchen',
  LIVING_ROOM: 'living_room',
  DINING_ROOM: 'dining_room',
  OUTDOOR: 'outdoor',
  LAUNDRY: 'laundry',
  OFFICE: 'office',
  HALLWAY: 'hallway',
  OTHER: 'other',
};

export const ROOM_SUGGESTIONS = [
  {
    type: ROOM_TYPES.BEDROOM,
    label: 'Bedroom',
    icon: 'bed-outline',
    defaultName: 'Master Bedroom',
    exampleTips: [
      'Bed must be made with white linens, corners tucked',
      'Nightstands should be dust-free and organized',
      'Check closet is tidy, hangers evenly spaced',
      'Windows should be streak-free',
      'Take photo of TV on to show it works',
    ],
  },
  {
    type: ROOM_TYPES.BATHROOM,
    label: 'Bathroom',
    icon: 'water-outline',
    defaultName: 'Main Bathroom',
    exampleTips: [
      'Towels folded and placed on rack',
      'Shower/tub should be spotless, no soap scum',
      'Mirror and fixtures should be streak-free and shining',
      'Toilet cleaned inside and out',
      'Check for any hair or debris',
    ],
  },
  {
    type: ROOM_TYPES.KITCHEN,
    label: 'Kitchen',
    icon: 'restaurant-outline',
    defaultName: 'Kitchen',
    exampleTips: [
      'Counters must be clear and wiped down',
      'Sink should be empty and polished',
      'Appliances (microwave, oven, fridge) clean inside and out',
      'Take photo of stove with all burners visible',
      'Check floors are mopped, no crumbs',
    ],
  },
  {
    type: ROOM_TYPES.LIVING_ROOM,
    label: 'Living Room',
    icon: 'tv-outline',
    defaultName: 'Living Room',
    exampleTips: [
      'Couch cushions fluffed and arranged neatly',
      'Coffee table clear and dust-free',
      'Remote controls placed on table',
      'Take photo of TV on showing home screen',
      'Check floors are vacuumed',
    ],
  },
  {
    type: ROOM_TYPES.OUTDOOR,
    label: 'Outdoor Area',
    icon: 'sunny-outline',
    defaultName: 'Outdoor Area',
    exampleTips: [
      'Pool: Take photo showing water is clean and clear',
      'Lawn: Photo showing grass is mowed and edges trimmed',
      'Patio furniture wiped down and arranged',
      'Check for any trash or debris',
      'BBQ grill cleaned if present',
    ],
  },
  {
    type: ROOM_TYPES.DINING_ROOM,
    label: 'Dining Room',
    icon: 'fast-food-outline',
    defaultName: 'Dining Room',
    exampleTips: [
      'Table surface clean and polished',
      'Chairs pushed in evenly',
      'Check floors under table',
      'Any decor should be dust-free',
    ],
  },
  {
    type: ROOM_TYPES.LAUNDRY,
    label: 'Laundry Room',
    icon: 'shirt-outline',
    defaultName: 'Laundry Room',
    exampleTips: [
      'Washer and dryer wiped down',
      'Check lint trap is clean',
      'Floor swept and mopped',
      'Detergent bottles organized',
    ],
  },
  {
    type: ROOM_TYPES.OFFICE,
    label: 'Office/Study',
    icon: 'briefcase-outline',
    defaultName: 'Office',
    exampleTips: [
      'Desk surface clear and organized',
      'Chair tucked in',
      'Check for dust on surfaces',
      'Cables organized neatly',
    ],
  },
];

export const getRoomSuggestionByType = (type) => {
  return ROOM_SUGGESTIONS.find((room) => room.type === type);
};

export const getExampleTipsText = (type) => {
  const suggestion = getRoomSuggestionByType(type);
  return suggestion ? suggestion.exampleTips.join('\n• ') : '';
};

