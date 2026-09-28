-- Customization engine v2 template data.
-- Backward-compatible: legacy print template keys are retained for current main.

UPDATE categories SET print_template = '{
"templateVersion":2,"printType":"cylindrical","shape":"rectangle",
"physical":{"width":7.5,"height":3.5,"unit":"in","dpi":300},
"safeArea":{"topPct":3,"rightPct":3,"bottomPct":3,"leftPct":3},"bleed":null,"maskUrl":null,
"views":[
{"id":"front","name":"Front","mockupUrl":"/images/mockups/mug-front.jpg","printArea":{"xPct":33,"yPct":44,"widthPct":34,"heightPct":26},"source":{"xPct":33.333,"yPct":0,"widthPct":33.334,"heightPct":100}},
{"id":"left","name":"Left","mockupUrl":"/images/mockups/mug-handle-right.jpg","printArea":{"xPct":25,"yPct":44,"widthPct":33,"heightPct":26},"source":{"xPct":0,"yPct":0,"widthPct":33.334,"heightPct":100}},
{"id":"right","name":"Right","mockupUrl":"/images/mockups/mug-handle-left.jpg","printArea":{"xPct":41,"yPct":44,"widthPct":33,"heightPct":26},"source":{"xPct":66.666,"yPct":0,"widthPct":33.334,"heightPct":100}}],
"widthInches":7.5,"heightInches":3.5,"blankMockupUrl":"/images/mockups/mug-front.jpg",
"printAreaOnMockup":{"xPct":28,"yPct":28,"widthPct":44,"heightPct":52}
}'::jsonb WHERE slug='mugs-drinkware';

UPDATE categories SET print_template = '{
"templateVersion":2,"printType":"flat","shape":"rectangle",
"physical":{"width":10,"height":12,"unit":"in","dpi":300},
"safeArea":{"topPct":3,"rightPct":3,"bottomPct":3,"leftPct":3},"bleed":null,"maskUrl":null,
"views":[{"id":"front","name":"Front","mockupUrl":"","printArea":{"xPct":30,"yPct":25,"widthPct":40,"heightPct":50},"source":{"xPct":0,"yPct":0,"widthPct":100,"heightPct":100}}],
"widthInches":10,"heightInches":12,"blankMockupUrl":"",
"printAreaOnMockup":{"xPct":30,"yPct":25,"widthPct":40,"heightPct":50}
}'::jsonb WHERE slug='tshirts-apparel';

UPDATE categories SET print_template = '{
"templateVersion":2,"printType":"flat","shape":"square",
"physical":{"width":8,"height":8,"unit":"in","dpi":300},
"safeArea":{"topPct":3,"rightPct":3,"bottomPct":3,"leftPct":3},"bleed":null,"maskUrl":null,
"views":[{"id":"front","name":"Front","mockupUrl":"","printArea":{"xPct":20,"yPct":20,"widthPct":60,"heightPct":60},"source":{"xPct":0,"yPct":0,"widthPct":100,"heightPct":100}}],
"widthInches":8,"heightInches":8,"blankMockupUrl":"",
"printAreaOnMockup":{"xPct":20,"yPct":20,"widthPct":60,"heightPct":60}
}'::jsonb WHERE slug='cushions-couple-gifts';

UPDATE products SET customization = customization || jsonb_build_object('templateOverride','{
"templateVersion":1,"printType":"cylindrical","shape":"rectangle",
"physical":{"width":7.5,"height":3.5,"unit":"in","dpi":300},
"safeArea":{"topPct":10,"rightPct":3,"bottomPct":10,"leftPct":3},"bleed":null,"maskUrl":null,
"views":[
{"id":"front","name":"Front","mockupUrl":"/images/products/bottle_water.png","printArea":{"xPct":25,"yPct":22,"widthPct":50,"heightPct":45},"source":{"xPct":33.333,"yPct":0,"widthPct":33.334,"heightPct":100}},
{"id":"left","name":"Left","mockupUrl":"/images/products/bottle_water.png","printArea":{"xPct":25,"yPct":22,"widthPct":50,"heightPct":45},"source":{"xPct":0,"yPct":0,"widthPct":33.334,"heightPct":100}},
{"id":"right","name":"Right","mockupUrl":"/images/products/bottle_water.png","printArea":{"xPct":25,"yPct":22,"widthPct":50,"heightPct":45},"source":{"xPct":66.666,"yPct":0,"widthPct":33.334,"heightPct":100}}]
}'::jsonb) WHERE slug='water-bottle';

UPDATE products SET customization = customization || jsonb_build_object('templateOverride','{
"templateVersion":1,"printType":"shaped","shape":"heart",
"physical":{"width":8,"height":8,"unit":"in","dpi":300},
"safeArea":{"topPct":3,"rightPct":3,"bottomPct":3,"leftPct":3},"bleed":null,"maskUrl":null,
"views":[{"id":"front","name":"Front","mockupUrl":"/images/products/cushion_heart.png","printArea":{"xPct":25,"yPct":22,"widthPct":50,"heightPct":45},"source":{"xPct":0,"yPct":0,"widthPct":100,"heightPct":100}}]
}'::jsonb) WHERE slug='heart-cushion';
