/* Declare a class that takes care of the annotation of the meta information that is populated below 
    the post-MED plot and below the profiles plot */
    class PopulatePlotMetaInfo{
        constructor({meta_info_method, plot_type}){
            // Call the function that gets the meta info data object
            // This is strucured as two nested sets of objecets
            // First object (sample or profile) uid. This is paired with 
            // an object that is meta info property (e.g. uid, name) and value (e.g. 6374, 'a_name')
            this.meta_info = meta_info_method();
            // Create a name to uid dictionary using an anonymous method
            this.name_to_uid_dict = this._make_name_to_uid_dict();
            // Get an array of the meta info property keys that are available
            this.available_meta_info = Object.keys(this.meta_info[Object.keys(this.meta_info)[0]]);
            // This is either 'post_med' or 'profile'
            this.plot_type = plot_type;
            // For presentation in the meta_info section of the plot cards, we will use
            // slightly different strings than actual meta info property keys.
            // To map between the two we use this meta_annotation_to_key dict
            if (this.plot_type == 'post_med'){
                this.meta_annotation_to_key = {
                "sample": "name",
                "UID": "uid",
                "taxa": "taxa_string",
                "lat": "lat",
                "lon": "lon",
                "collection_date": "collection_date",
                "depth": "collection_depth",
                "clade_relative_abund": "clade_prop_string",
                "clade_absolute_abund": "clade_abs_abund_string",
                "raw_contigs": "raw_contigs",
                "post_qc_absolute": "post_taxa_id_absolute_symbiodinium_seqs",
                "post_qc_unique": "post_taxa_id_unique_symbiodinium_seqs",
                "post_med_absolute": "post_med_absolute",
                "post_med_unique": "post_med_unique",
                "non_Symbiodiniaceae_absolute": "post_taxa_id_absolute_non_symbiodinium_seqs",
                "non_Symbiodiniaceae_unique": "post_taxa_id_unique_non_symbiodinium_seqs"
                };
                this.meta_info_annotation_order_array_primary = ["sample", "UID", "taxa", "lat", "lon"];
                this.meta_info_annotation_order_array_secondary = ["collection_date", "depth",
                    "clade_relative_abund", "clade_absolute_abund", "raw_contigs", "post_qc_absolute", "post_qc_unique",
                    "post_med_absolute", "post_med_unique", "non_Symbiodiniaceae_absolute", "non_Symbiodiniaceae_unique"
                ];
            }else if (this.plot_type == 'profile'){
                this.meta_annotation_to_key = {
                    "profile": "name",
                    "UID": "uid",
                    "genera": "genera",
                    "maj_seq": "maj_its2_seq",
                    "associated species": "assoc_species",
                    "local_abund": "local_abund",
                    "db_abund": "db_abund",
                    "seq_uids": "seq_uids",
                    "seq_abund_string": "seq_abund_string"
                };
                this.meta_info_annotation_order_array_primary = ["profile", "UID", "genera"];
                this.meta_info_annotation_order_array_secondary = ["maj_seq", "species", "local_abund", "db_abund",
                    "seq_uids", "seq_abund_string"
                ];
            }
        }
        // The main method that is used to do the population of the meta information area
        // TODO: we will have to see how similar the code is between the post-MED and profile instances
        // of this class to see whether we can use this same method for both.
        // Post-MED
        populateMetaInfo() {
            for (let i = 0; i < this.meta_info_annotation_order_array_primary.length; i++) {
                let annotation = this.meta_info_annotation_order_array_primary[i];
                if (this.available_meta_info.includes(this.meta_annotation_to_key[annotation])) {
                    // We want to put taxa on its own line because it is so big and the other two paris on the same line
                    if (annotation == "taxa") {
                        if (this.plot_type == 'post_med'){
                            $(".primary_sample_meta").append(`<div style="width:100%;"><span style="font-weight:bold;">${annotation}: </span><span class="sample_meta_item mr-1" data-key=${this.meta_annotation_to_key[annotation]}>--</span></div>`);
                        }else if (this.plot_type == 'profile'){
                            $(".primary_profile_meta").append(`<div style="width:100%;"><span style="font-weight:bold;">${annotation}: </span><span class="profile_meta_item mr-1" data-key=${this.meta_annotation_to_key[annotation]}>--</span></div>`);
                        }
                    } else {
                        if (this.plot_type == 'post_med'){
                            $(".primary_sample_meta").append(`<div><span style="font-weight:bold;">${annotation}: </span><span class="sample_meta_item mr-1" data-key=${this.meta_annotation_to_key[annotation]}>--</span></div>`);
                        }else if (this.plot_type == 'profile'){
                            $(".primary_profile_meta").append(`<div><span style="font-weight:bold;">${annotation}: </span><span class="profile_meta_item mr-1" data-key=${this.meta_annotation_to_key[annotation]}>--</span></div>`);
                        }
                    }
                }
            }
            for (let i = 0; i < this.meta_info_annotation_order_array_secondary.length; i++) {
                let annotation = this.meta_info_annotation_order_array_secondary[i];
                if (this.available_meta_info.includes(this.meta_annotation_to_key[annotation])) {
                    if (this.plot_type == 'post_med'){
                        $(".secondary_sample_meta").append(`<div><span style="font-weight:bold;">${annotation}: </span><span class="sample_meta_item mr-1" data-key=${this.meta_annotation_to_key[annotation]}>--</span></div>`);
                    }else if (this.plot_type == 'profile'){
                        $(".secondary_profile_meta").append(`<div><span style="font-weight:bold;">${annotation}: </span><span class="profile_meta_item mr-1" data-key=${this.meta_annotation_to_key[annotation]}>--</span></div>`);
                    }
                }
            }
        }

        _make_name_to_uid_dict(){
            let temp_dict = {};
            let meta_info = this.meta_info;
            Object.keys(meta_info).forEach(function (uid) {
                temp_dict[meta_info[uid]["name"]] = +uid;
            })
            return temp_dict;
        }
    };