/* Canonical listing taxonomy. `value` is the database products.item_type key. */
window.MetupsProductTaxonomy = Object.freeze([
  ['Electronics', [['smartphones','Smartphones'],['feature-phones','Feature Phones'],['tablets','Tablets'],['laptops','Laptops'],['desktop-computers','Desktop Computers'],['monitors','Monitors'],['televisions','Televisions'],['cameras','Cameras'],['smartwatches','Smartwatches'],['headphones-earphones','Headphones & Earphones'],['speakers','Speakers'],['gaming-consoles','Gaming Consoles'],['gaming-accessories','Gaming Accessories'],['computer-accessories','Computer Accessories'],['networking-equipment','Networking Equipment'],['printers-scanners','Printers & Scanners'],['chargers-cables','Chargers & Cables'],['electronics-other','Other Electronics']]],
  ['Appliances', [['fridges-freezers','Fridges & Freezers'],['washing-machines','Washing Machines'],['cookers-stoves','Cookers & Stoves'],['microwaves','Microwaves'],['air-conditioners','Air Conditioners'],['fans','Fans'],['vacuum-cleaners','Vacuum Cleaners'],['small-kitchen-appliances','Small Kitchen Appliances'],['appliances-other','Other Appliances']]],
  ['Furniture', [['sofas','Sofas'],['beds','Beds'],['mattresses','Mattresses'],['wardrobes','Wardrobes'],['dining-tables','Dining Tables'],['chairs','Chairs'],['desks','Desks'],['office-furniture','Office Furniture'],['cabinets-shelves','Cabinets & Shelves'],['furniture-other','Other Furniture']]],
  ['Vehicles', [['cars','Cars'],['motorcycles','Motorcycles'],['bicycles','Bicycles'],['trucks','Trucks'],['vehicle-parts','Vehicle Parts'],['tyres','Tyres'],['vehicles-other','Other Vehicles']]],
  ['Fashion', [['mens-clothing',"Men's Clothing"],['womens-clothing',"Women's Clothing"],['childrens-clothing',"Children's Clothing"],['shoes','Shoes'],['bags','Bags'],['watches-jewellery','Watches & Jewellery'],['fashion-other','Other Fashion']]],
  ['Books', [['fiction-books','Fiction Books'],['textbooks','Textbooks'],['study-materials','Study Materials'],['books-other','Other Books']]],
  ['Home & Garden', [['power-tools','Power Tools'],['hand-tools','Hand Tools'],['garden-equipment','Garden Equipment'],['home-decor','Home Decor']]],
  ['Baby & Kids', [['baby-gear','Baby Gear'],['toys-games','Toys & Games']]],
  ['Sports & Outdoors', [['sports-equipment','Sports Equipment'],['fitness-equipment','Fitness Equipment']]],
  ['Other', [['musical-instruments','Musical Instruments'],['other','Other / Unspecified']]],
]);

window.MetupsItemTypeCategory = Object.freeze(Object.fromEntries(
  window.MetupsProductTaxonomy.flatMap(([category, types]) => types.map(([value]) => [value, category])),
));
window.MetupsItemTypeLabel = Object.freeze(Object.fromEntries(
  window.MetupsProductTaxonomy.flatMap(([, types]) => types.map(([value, label]) => [value, label])),
));
