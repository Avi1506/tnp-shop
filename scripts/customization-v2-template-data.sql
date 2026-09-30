-- Customization engine v2 template data.
-- Backward-compatible: legacy print template keys are retained for current main.

UPDATE categories SET print_template = '{
"templateVersion":5,"printType":"cylindrical","shape":"rectangle",
"physical":{"width":7.5,"height":3.5,"unit":"in","dpi":300},
"safeArea":{"topPct":3,"rightPct":3,"bottomPct":3,"leftPct":3},"bleed":null,"maskUrl":null,
"cylindrical3d":{"modelRef":"procedural:mug-v1","radius":1.18,"bodyHeight":2.45,"wrapCoverageDeg":270,"wrapOffsetDeg":0,"cameraDistance":6.2,"cameraPitchDeg":5,"baseColor":"#f7f7f4","roughness":0.34,"metalness":0,"handleSide":"right"},
"views":[
{"id":"front","name":"Front","mockupUrl":"/images/mockups/mug-left.jpg","printArea":{"xPct":29,"yPct":31.5,"widthPct":42,"heightPct":52},"source":{"xPct":22.5,"yPct":0,"widthPct":55,"heightPct":100},"curvatureStrength":1.12,"perspectiveStrength":0,"edgeFalloff":0.32,"blendMode":"multiply","angleDeg":0},
{"id":"left","name":"Left","mockupUrl":"/images/mockups/mug-handle-left.jpg","printArea":{"xPct":30,"yPct":31.5,"widthPct":41,"heightPct":52},"source":{"xPct":0,"yPct":0,"widthPct":55,"heightPct":100},"curvatureStrength":1.18,"perspectiveStrength":-0.08,"edgeFalloff":0.36,"blendMode":"multiply","angleDeg":-65},
{"id":"right","name":"Right","mockupUrl":"/images/mockups/mug-left.jpg","printArea":{"xPct":29,"yPct":31.5,"widthPct":41,"heightPct":52},"source":{"xPct":45,"yPct":0,"widthPct":55,"heightPct":100},"curvatureStrength":1.18,"perspectiveStrength":0.08,"edgeFalloff":0.36,"blendMode":"multiply","angleDeg":65}],
"widthInches":7.5,"heightInches":3.5,"blankMockupUrl":"/images/mockups/mug-left.jpg",
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
"templateVersion":2,"printType":"cylindrical","shape":"rectangle",
"physical":{"width":7.5,"height":3.5,"unit":"in","dpi":300},
"safeArea":{"topPct":10,"rightPct":3,"bottomPct":10,"leftPct":3},"bleed":null,"maskUrl":null,
"cylindrical3d":{"modelRef":"procedural:bottle-v1","radius":0.92,"bodyHeight":3.35,"wrapCoverageDeg":300,"wrapOffsetDeg":0,"cameraDistance":6.4,"cameraPitchDeg":3,"baseColor":"#ececec","roughness":0.32,"metalness":0.42},
"views":[
{"id":"front","name":"Front","mockupUrl":"/images/products/bottle_water.png","printArea":{"xPct":54,"yPct":44,"widthPct":37,"heightPct":43},"source":{"xPct":22.5,"yPct":0,"widthPct":55,"heightPct":100},"curvatureStrength":0.92,"perspectiveStrength":0,"edgeFalloff":0.32,"blendMode":"multiply","angleDeg":0},
{"id":"left","name":"Left","mockupUrl":"/images/products/bottle_water.png","printArea":{"xPct":54,"yPct":44,"widthPct":37,"heightPct":43},"source":{"xPct":0,"yPct":0,"widthPct":55,"heightPct":100},"curvatureStrength":0.92,"perspectiveStrength":-0.10,"edgeFalloff":0.35,"blendMode":"multiply","angleDeg":-65},
{"id":"right","name":"Right","mockupUrl":"/images/products/bottle_water.png","printArea":{"xPct":54,"yPct":44,"widthPct":37,"heightPct":43},"source":{"xPct":45,"yPct":0,"widthPct":55,"heightPct":100},"curvatureStrength":0.92,"perspectiveStrength":0.10,"edgeFalloff":0.35,"blendMode":"multiply","angleDeg":65}]
}'::jsonb) WHERE slug='water-bottle';

UPDATE products SET customization = customization || jsonb_build_object('templateOverride','{
"templateVersion":1,"printType":"shaped","shape":"heart",
"physical":{"width":8,"height":8,"unit":"in","dpi":300},
"safeArea":{"topPct":3,"rightPct":3,"bottomPct":3,"leftPct":3},"bleed":null,"maskUrl":null,
"views":[{"id":"front","name":"Front","mockupUrl":"/images/products/cushion_heart.png","printArea":{"xPct":25,"yPct":22,"widthPct":50,"heightPct":45},"source":{"xPct":0,"yPct":0,"widthPct":100,"heightPct":100}}]
}'::jsonb) WHERE slug='heart-cushion';
