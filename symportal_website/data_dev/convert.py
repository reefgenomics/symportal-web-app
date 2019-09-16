"""
This python file will be used for converting the .js data into formats that will work with our playaround html

First thing I would like to try is to work with rectangles rather than all of this stacked barcharts black magic,
especially as we have lots of bars that are 0 in our data.

We will make an array of objects where each object is rectangle. It will have attibutes for sample, y, height, and fill


"""

import json


def make_rect_array(path_of_json_dir_to_convert, function_name, path_of_js_file_to_write_out_to, pre_post):

    with open(path_of_json_dir_to_convert, 'r') as f:
        json_cont = f.read()
    json_rel_abund_pre_med = json.loads(json_cont)

    colour_dict = {}
    if pre_post == "pre":
        with open("html_data/color_dict_preMED.json", 'r') as f:
            color_string = f.read()
    else:
        with open("html_data/color_dict_postMED.json", 'r') as f:
            color_string = f.read()

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
    max_cumulative = 0
    sample_list = []
    for sample_dict in json_rel_abund_pre_med:
        sample_list.append(sample_dict["sample_name"])
        cumulative_count = 0
        for seq in seq_order_list:
            seq_abund = sample_dict[seq]
            if seq_abund:
                cumulative_count += float(sample_dict[seq])
                new_rect_list.append({
                    "sample": sample_dict["sample_name"],
                    "seq_name": seq,
                    "y": cumulative_count,
                    "height": float(seq_abund),
                    "fill": colour_dict[seq]
                })


        if cumulative_count > max_cumulative:
            max_cumulative = cumulative_count
    # here we should have the sample_dict populated
    # now write this out as a json file
    json_dict = json.dumps(new_rect_list)
    # with open('html_data/rect_array_preMED_relative.json', 'w') as f:
    #     f.write(f'{json_dict}\n')
    js_file = ["function " + function_name + "(){"]
    js_file.append("return " + json_dict + "}")

    # if postMED then also write out the function that will return the larges abosulte number of sequnces
    if "Absolute" in function_name:
        js_file.append("function " + function_name + "MaxSeq" + "(){")
        js_file.append("return " + str(int(max_cumulative)) + "}")
    js_file.append("function " + function_name + "SampleList" + "(){")
    js_file.append("return " + json.dumps(sample_list) + "}")

    with open(path_of_js_file_to_write_out_to, 'w') as f:
        for line in js_file:
            f.write(f'{line}\n')



# We will need to do this for both the absolute and relative versions of the pre and post MED so 4 times
make_rect_array(path_of_json_dir_to_convert = "html_data/seq.relative.preMED.json", function_name = "getRectDataRelativePreMED", path_of_js_file_to_write_out_to = "html_data/rect_array_preMED_relative.js", pre_post="pre")
make_rect_array(path_of_json_dir_to_convert = "html_data/seq.absolute.preMED.json", function_name = "getRectDataAbsolutePreMED", path_of_js_file_to_write_out_to = "html_data/rect_array_preMED_absolute.js", pre_post="pre")
make_rect_array(path_of_json_dir_to_convert = "html_data/seq.relative.postMED.json", function_name = "getRectDataRelativePostMED", path_of_js_file_to_write_out_to = "html_data/rect_array_postMED_relative.js", pre_post="post")
make_rect_array(path_of_json_dir_to_convert = "html_data/seq.absolute.postMED.json", function_name = "getRectDataAbsolutePostMED", path_of_js_file_to_write_out_to = "html_data/rect_array_postMED_absolute.js", pre_post="post")


foo = 'bar'