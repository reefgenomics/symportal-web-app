import pandas as pd

df  = pd.read_csv(sep='\t', filepath_or_buffer="seqs.absolute.tsv")
this = df.to_json(path_or_buf="seqs.absolute.json", orient='records')
apples  = 'asdf'