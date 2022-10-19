window.nomadEnv = {
    'appBase': 'http://localhost:8000/fairdi/nomad/latest',
    'northBase': 'http://localhost:9000/fairdi/nomad/latest/north',
    'keycloakBase': 'https://nomad-lab.eu/fairdi/keycloak/auth/',
    'keycloakRealm': 'fairdi_nomad_test',
    'keycloakClientId': 'nomad_public',
    'debug': false,
    'encyclopediaBase': 'https://nomad-lab.eu/prod/rae/encyclopedia/#',
    'aitoolkitEnabled': false,
    'oasis': false,
    'version': {},
    'globalLoginRequired': false,
    'servicesUploadLimit': 10,
    'ui': {"search_contexts": {"include": ["entries", "materials"], "exclude": [], "options": {"entries": {"label": "Entries", "path": "entries", "resource": "entries", "breadcrumb": "Entries search", "description": "Search individual entries", "help": {"title": "Entries search", "content": "This page allows you to **search entries** within NOMAD. Entries represent\nindividual calculations or experiments that have bee uploaded into NOMAD.\n\nThe search page consists of three main elements: the filter panel, the search\nbar, and the result list.\n\nThe filter panel on the left allows you to graphically explore and enter\ndifferent search filters. It also gives a visual indication of the currently\nactive search filters for each category. This is a good place to start exploring\nthe available search filters and their meaning.\n\nThe search bar allows you to specify filters by typing them in and pressing\nenter. You can also start by simply typing keywords of interest, which will\ntoggle a list of suggestions. For numerical data you can also use range queries,\ne.g. \\`0.0 < band_gap <= 0.1\\`.\n\nNotice that the units used in the filter panel and in the queries can be changed\nusing the **units** button on the top right corner. When using the search bar,\nyou can also specify a unit by typing the unit abbreviations, e.g. \\`band_gap >=\n0.1 Ha\\`\n\nThe result list on the right is automatically updated according to the filters\nyou have specified. You can browse through the results by scrolling through the\navailable items and loading more results as you go. Here you can also change the\nsorting of the results, modify the displayed columns, access individual entries\nor even download the raw data or the archive document by selecting individual\nentries and pressing the download button that appears. The ellipsis button shown\nfor each entry will navigate you to that entry's page. This entry page will show\nmore metadata, raw files, the entry's archive, and processing logs."}, "pagination": {"order_by": "upload_create_time", "order": "desc", "page_size": 20}, "columns": {"enable": ["entry_name", "results.material.chemical_formula_hill", "entry_type", "upload_create_time", "authors"], "include": ["entry_name", "results.material.chemical_formula_hill", "entry_type", "results.method.method_name", "results.method.simulation.program_name", "results.method.simulation.dft.basis_set_name", "results.method.simulation.dft.xc_functional_type", "results.material.structural_type", "results.material.symmetry.crystal_system", "results.material.symmetry.space_group_symbol", "results.material.symmetry.space_group_number", "results.eln.lab_ids", "results.eln.sections", "results.eln.methods", "results.eln.tags", "results.eln.instruments", "mainfile", "upload_create_time", "authors", "comment", "references", "datasets", "published"], "exclude": [], "options": {"entry_name": {"label": "Name", "align": "left"}, "results.material.chemical_formula_hill": {"label": "Formula", "align": "left"}, "entry_type": {"label": "Entry type", "align": "left"}, "results.method.method_name": {"label": "Method name"}, "results.method.simulation.program_name": {"label": "Program name"}, "results.method.simulation.dft.basis_set_name": {"label": "Basis set name"}, "results.method.simulation.dft.xc_functional_type": {"label": "XC functional type"}, "results.material.structural_type": {"label": "Structural type"}, "results.material.symmetry.crystal_system": {"label": "Crystal system"}, "results.material.symmetry.space_group_symbol": {"label": "Space group symbol"}, "results.material.symmetry.space_group_number": {"label": "Space group number"}, "results.eln.lab_ids": {"label": "Lab IDs"}, "results.eln.sections": {"label": "Sections"}, "results.eln.methods": {"label": "Methods"}, "results.eln.tags": {"label": "Tags"}, "results.eln.instruments": {"label": "Instruments"}, "mainfile": {"label": "Mainfile", "align": "left"}, "upload_create_time": {"label": "Upload time", "align": "left"}, "authors": {"label": "Authors", "align": "left"}, "comment": {"label": "Comment", "align": "left"}, "references": {"label": "References", "align": "left"}, "datasets": {"label": "Datasets", "align": "left"}, "published": {"label": "Access"}}}, "rows": {"actions": {"enable": true}, "details": {"enable": true}, "selection": {"enable": true}}, "filter_menus": {"include": ["material", "elements", "symmetry", "method", "simulation", "dft", "gw", "experiment", "eels", "properties", "electronic", "optoelectronic", "vibrational", "mechanical", "spectroscopy", "thermodynamic", "geometry_optimization", "eln", "author", "dataset", "access", "ids", "processed_data_quantities", "optimade"], "exclude": [], "options": {"material": {"label": "Material", "level": 0, "size": "small", "menu_items": {}}, "elements": {"label": "Elements / Formula", "level": 1, "size": "large", "menu_items": {}}, "symmetry": {"label": "Symmetry", "level": 1, "size": "small", "menu_items": {}}, "method": {"label": "Method", "level": 0, "size": "small", "menu_items": {}}, "simulation": {"label": "Simulation", "level": 1, "size": "small", "menu_items": {}}, "dft": {"label": "DFT", "level": 2, "size": "small", "menu_items": {}}, "gw": {"label": "GW", "level": 2, "size": "small", "menu_items": {}}, "experiment": {"label": "Experiment", "level": 1, "size": "small"}, "eels": {"label": "EELS", "level": 2, "size": "small", "menu_items": {}}, "properties": {"label": "Properties", "level": 0, "size": "small"}, "electronic": {"label": "Electronic", "level": 1, "size": "small", "menu_items": {}}, "optoelectronic": {"label": "Optoelectronic", "level": 1, "size": "small", "menu_items": {}}, "vibrational": {"label": "Vibrational", "level": 1, "size": "small", "menu_items": {}}, "mechanical": {"label": "Mechanical", "level": 1, "size": "small", "menu_items": {}}, "spectroscopy": {"label": "Spectroscopy", "level": 1, "size": "small", "menu_items": {}}, "thermodynamic": {"label": "Thermodynamic", "level": 1, "size": "small", "menu_items": {}}, "geometry_optimization": {"label": "Geometry Optimization", "level": 1, "size": "small", "menu_items": {}}, "eln": {"label": "Electronic Lab Notebook", "level": 0, "size": "small", "menu_items": {}}, "author": {"label": "Author / Origin", "level": 0, "size": "medium", "menu_items": {}}, "dataset": {"label": "Dataset", "level": 0, "size": "small", "menu_items": {}}, "access": {"label": "Access", "level": 0, "size": "small", "menu_items": {}}, "ids": {"label": "IDs", "level": 0, "size": "small", "menu_items": {}}, "processed_data_quantities": {"label": "Processed Data Quantities", "level": 0, "size": "medium", "menu_items": {}}, "optimade": {"label": "Optimade", "level": 0, "size": "medium", "menu_items": {}}}}}, "materials": {"label": "Materials", "path": "materials", "resource": "materials", "breadcrumb": "Materials search", "description": "Search materials that are identified from the entries", "help": {"title": "Materials search", "content": "This page allows you to **search materials** within NOMAD. NOMAD can\nautomatically detect the material from individual entries and can then group the\ndata by using these detected materials. This allows you to search individual\nmaterials which have properties that are aggregated from several entries.\n\nThe search page consists of three main elements: the filter panel, the search\nbar, and the result list.\n\nThe filter panel on the left allows you to graphically explore and enter\ndifferent search filters. It also gives a visual indication of the currently\nactive search filters for each category. This is a good place to start exploring\nthe available search filters and their meaning.\n\nThe search bar allows you to specify filters by typing them in and pressing\nenter. You can also start by simply typing keywords of interest, which will\ntoggle a list of suggestions. For numerical data you can also use range queries,\ne.g. \\`0.0 < band_gap <= 0.1\\`.\n\nThe units used in the filter panel and in the queries can be changed\nusing the **units** button on the top right corner. When using the search bar,\nyou can also specify a unit by typing the unit abbreviations, e.g. \\`band_gap >=\n0.1 Ha\\`.\n\nNotice that by default the properties that you search can be combined from\nseveral different entries. If instead you wish to search for a material with an\nindividual entry fullfilling your search criteria, uncheck the **combine results\nfrom several entries**-checkbox.\n\nThe result list on the right is automatically updated according to the filters\nyou have specified. You can scroll through the available items and load more\nresults as you go. Here you can also change the sorting of the results, modify\nthe displayed columns and access individual materials. The ellipsis button shown\nfor each material will navigate you into the material overview page within the\nNOMAD Encyclopedia. This page will show a more detailed overview for that\nspecific material."}, "pagination": {"order_by": "chemical_formula_hill", "order": "asc"}, "columns": {"enable": ["chemical_formula_hill", "structural_type", "symmetry.structure_name", "symmetry.space_group_number", "symmetry.crystal_system"], "include": ["chemical_formula_hill", "structural_type", "symmetry.structure_name", "symmetry.crystal_system", "symmetry.space_group_symbol", "symmetry.space_group_number", "material_id"], "exclude": [], "options": {"chemical_formula_hill": {"label": "Formula", "align": "left"}, "structural_type": {"label": "Structural type"}, "symmetry.structure_name": {"label": "Structure name"}, "symmetry.crystal_system": {"label": "Crystal system"}, "symmetry.space_group_symbol": {"label": "Space group symbol"}, "symmetry.space_group_number": {"label": "Space group number"}, "material_id": {"label": "Material ID"}}}, "rows": {"actions": {"enable": true}, "details": {"enable": false}, "selection": {"enable": false}}, "filter_menus": {"include": ["material", "elements", "symmetry", "method", "simulation", "dft", "gw", "experiment", "eels", "properties", "electronic", "optoelectronic", "vibrational", "mechanical", "spectroscopy", "thermodynamic", "geometry_optimization", "eln", "author", "dataset", "access", "ids", "processed_data_quantities", "optimade", "combine"], "exclude": [], "options": {"material": {"label": "Material", "level": 0, "size": "small", "menu_items": {}}, "elements": {"label": "Elements / Formula", "level": 1, "size": "large", "menu_items": {}}, "symmetry": {"label": "Symmetry", "level": 1, "size": "small", "menu_items": {}}, "method": {"label": "Method", "level": 0, "size": "small", "menu_items": {}}, "simulation": {"label": "Simulation", "level": 1, "size": "small", "menu_items": {}}, "dft": {"label": "DFT", "level": 2, "size": "small", "menu_items": {}}, "gw": {"label": "GW", "level": 2, "size": "small", "menu_items": {}}, "experiment": {"label": "Experiment", "level": 1, "size": "small"}, "eels": {"label": "EELS", "level": 2, "size": "small", "menu_items": {}}, "properties": {"label": "Properties", "level": 0, "size": "small"}, "electronic": {"label": "Electronic", "level": 1, "size": "small", "menu_items": {}}, "optoelectronic": {"label": "Optoelectronic", "level": 1, "size": "small", "menu_items": {}}, "vibrational": {"label": "Vibrational", "level": 1, "size": "small", "menu_items": {}}, "mechanical": {"label": "Mechanical", "level": 1, "size": "small", "menu_items": {}}, "spectroscopy": {"label": "Spectroscopy", "level": 1, "size": "small", "menu_items": {}}, "thermodynamic": {"label": "Thermodynamic", "level": 1, "size": "small", "menu_items": {}}, "geometry_optimization": {"label": "Geometry Optimization", "level": 1, "size": "small", "menu_items": {}}, "eln": {"label": "Electronic Lab Notebook", "level": 0, "size": "small", "menu_items": {}}, "author": {"label": "Author / Origin", "level": 0, "size": "medium", "menu_items": {}}, "dataset": {"label": "Dataset", "level": 0, "size": "small", "menu_items": {}}, "access": {"label": "Access", "level": 0, "size": "small", "menu_items": {}}, "ids": {"label": "IDs", "level": 0, "size": "small", "menu_items": {}}, "processed_data_quantities": {"label": "Processed Data Quantities", "level": 0, "size": "medium", "menu_items": {}}, "optimade": {"label": "Optimade", "level": 0, "size": "medium", "menu_items": {}}, "combine": {"actions": {"include": ["combine"], "options": {"combine": {"type": "checkbox", "label": "Combine results from several entries", "quantity": "combine"}}}}}}}}}}
};
