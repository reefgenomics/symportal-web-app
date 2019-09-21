"""
This python file will be used for converting the .js data into formats that will work with our playaround html

First thing I would like to try is to work with rectangles rather than all of this stacked barcharts black magic,
especially as we have lots of bars that are 0 in our data.

We will make an array of objects where each object is rectangle. It will have attibutes for sample, y, height, and fill

The next thing to try will be to have a js object array of objects (i.e. a dictionary) where a sample is the key
and a list of rectangles (as used in the previous structure will be the value.
"""

import json
from collections import defaultdict


def make_rect_array(
        path_of_json_dir_to_convert_rel, path_of_json_dir_to_convert_abs,
        function_name,
        path_of_js_file_to_write_out_to, pre_post_prof):
    """Adjust pre_post_prof according to the type of output"""

    # first get the relative abundance
    with open(path_of_json_dir_to_convert_rel, 'r') as f:
        json_cont = f.read()
    json_rel_abund_list_of_dicts = json.loads(json_cont)
    json_rel_abund_dict_of_dicts = {sub_dict['sample_name']: sub_dict for sub_dict in json_rel_abund_list_of_dicts}
    sample_list = [sub_dict['sample_name'] for sub_dict in json_rel_abund_list_of_dicts]
    # then get the absolute abundances
    with open(path_of_json_dir_to_convert_abs, 'r') as f:
        json_cont = f.read()
    json_abs_abund_list_of_dicts = json.loads(json_cont)
    json_abs_abund_dict_of_dicts = {sub_dict['sample_name']:sub_dict for sub_dict in json_abs_abund_list_of_dicts}

    colour_dict = {}
    if pre_post_prof == "pre":
        with open("html_data/color_dict_preMED.json", 'r') as f:
            color_string = f.read()
    elif pre_post_prof == "post":
        with open("html_data/color_dict_postMED.json", 'r') as f:
            color_string = f.read()
    else:  # profiles
        # if working with profiles we will also need to get a dictionary that can do uid to profile name
        with open("html_data/color_dict_profile.json", 'r') as f:
            color_string = f.read()
        with open("html_data/profile.meta.json", 'r') as f:
            profile_meta_string = f.read()
        profile_meta_dict = json.loads(profile_meta_string)
        prof_uid_to_name_dict = {}
        for sub_dict in profile_meta_dict:
            prof_uid_to_name_dict[sub_dict["ITS2 type profile UID"]] = sub_dict["ITS2 type profile"]

    colour_dict_json = json.loads(color_string)

    # also get the seq list order when we are turning this into the new dict
    seq_order_list = []
    for smll_dict in colour_dict_json:
        colour_dict[smll_dict["d_key"]] = smll_dict["d_value"]
        seq_order_list.append(smll_dict["d_key"])
    new_rect_list = []


    # each rect that we add to this needs to be a dictionary and then we'll be able to make these into a json file
    # if this is an absolute then we also want to keep track of the maximum number for a given sample
    # as we will need to use this when we are setting the domain of the y axis objects
    # we will want to have this value for both the postMED and the preMED versions of this
    # we will write the value in as another function in the .js file that we write out at the end
    max_cumulative_abs = 0
    for sample_key in json_rel_abund_dict_of_dicts.keys():
        rel_dict = json_rel_abund_dict_of_dicts[sample_key]
        abs_dict = json_abs_abund_dict_of_dicts[sample_key]

        cumulative_count_rel = 0
        cumulative_count_abs = 0

        for seq in seq_order_list:
            seq_abund_rel = rel_dict[seq]
            seq_abund_abs = abs_dict[seq]
            if seq_abund_rel:
                cumulative_count_rel += float(seq_abund_rel)
                cumulative_count_abs += float(seq_abund_abs)

                if pre_post_prof == "profile":
                    new_rect_list.append({
                        "sample": sample_key,
                        "prof_name": prof_uid_to_name_dict[int(seq)],
                        "y_rel": cumulative_count_rel,
                        "y_abs": cumulative_count_abs,
                        "height_rel": float(seq_abund_rel),
                        "height_abs": float(seq_abund_abs),
                        "fill": colour_dict[seq]
                    })
                else:
                    new_rect_list.append({
                        "sample": sample_key,
                        "seq_name": seq,
                        "y_rel": cumulative_count_rel,
                        "y_abs": cumulative_count_abs,
                        "height_rel": float(seq_abund_rel),
                        "height_abs": float(seq_abund_abs),
                        "fill": colour_dict[seq]
                    })

        if cumulative_count_abs > max_cumulative_abs:
            max_cumulative_abs = cumulative_count_abs


    # # here we should have the sample_dict populated that will be the first structure and the second structure will
    # # be made from
    # # now write this out as a json file
    # json_dict = json.dumps(new_rect_list)
    #
    # js_file = ["function " + function_name_first_structure + "(){"]
    # js_file.append("return " + json_dict + "}")
    #
    # js_file.append("function " + function_name_first_structure + "MaxSeq" + "(){")
    # js_file.append("return " + str(int(max_cumulative_abs)) + "}")
    # js_file.append("function " + function_name_first_structure + "SampleList" + "(){")
    # js_file.append("return " + json.dumps(sample_list) + "}")
    #
    # with open(path_of_js_file_to_write_out_to_first_structure, 'w') as f:
    #     for line in js_file:
    #         f.write(f'{line}\n')

    # Make the second data structure type
    # here we have the second data structure ready
    second_data_structure = defaultdict(list)
    for sample in sample_list:
        second_data_structure[sample] = [sub_dict for sub_dict in new_rect_list if sub_dict["sample"] == sample]
    second_data_structure = dict(second_data_structure)
    json_second_data_structure = json.dumps(second_data_structure)

    js_file = ["function " + function_name + "(){"]
    js_file.append("return " + json_second_data_structure + "}")

    # if postMED then also write out the function that will return the larges abosulte number of sequnces

    js_file.append("function " + function_name + "MaxSeq" + "(){")
    js_file.append("return " + str(int(max_cumulative_abs)) + "}")
    js_file.append("function " + function_name + "SampleList" + "(){")
    js_file.append("return " + json.dumps(sample_list) + "}")

    with open(path_of_js_file_to_write_out_to, 'w') as f:
        for line in js_file:
            f.write(f'{line}\n')



# For each rect there will be data for the absolute and for relative so we only need to run it once for each of
# pre and POST.
make_rect_array(path_of_json_dir_to_convert_rel = "html_data/seq.relative.preMED.json", path_of_json_dir_to_convert_abs="html_data/seq.absolute.preMED.json",  function_name="getRectDataPreMEDBySample", path_of_js_file_to_write_out_to="html_data/rect_array_preMED_by_sample.js", pre_post_prof="pre")
make_rect_array(path_of_json_dir_to_convert_rel = "html_data/seq.relative.postMED.json", path_of_json_dir_to_convert_abs = "html_data/seq.absolute.postMED.json",  function_name="getRectDataPostMEDBySample", path_of_js_file_to_write_out_to="html_data/rect_array_postMED_by_sample.js", pre_post_prof="post")
make_rect_array(path_of_json_dir_to_convert_rel = "html_data/profile.relative.json", path_of_json_dir_to_convert_abs = "html_data/profile.absolute.json",  function_name="getRectDataProfileBySample", path_of_js_file_to_write_out_to="html_data/rect_array_profile_by_sample.js", pre_post_prof="profile")


foo = 'bar'