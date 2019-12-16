from sp_app import db
from sp_app.models import User, DataSet
import json

class PopulateDBFromJson:
    def __init__(self):
        self.path_to_json = 'published_articles.json'
        self.json_dataset_objects, self.json_user_objects = self._get_json_array()

    def _get_json_array(self):
        with open('published_articles.json', 'r') as f:
            return json.load(f)

    def populate_db(self):
        # Populate the db with dataset objects
        for json_ds_obj in self.json_dataset_objects:
            ds_query = DataSet.query.filter_by(data_name=json_ds_obj['data_name']).first()
            if not ds_query:
                ds = DataSet(
                    data_name=json_ds_obj['data_name'], study_name=json_ds_obj['study_name'],
                    study_to_load_str=json_ds_obj['study_to_load_str'], title=json_ds_obj['title'],
                    location=json_ds_obj['location'], num_samples=int(json_ds_obj['num_samples']),
                    additional_markers=json_ds_obj['additional_markers'], is_published=json_ds_obj['is_published'],
                    run_type=json_ds_obj['run_type'], article_url=json_ds_obj['article_url'],
                    seq_data_url=json_ds_obj['seq_data_url'], data_explorer=json_ds_obj['data_explorer']
                )
                db.session.add(ds)
            else:
                print(f'DataSet {ds_query} already exists')

        # Populate the db with user objects
        for json_user_obj in self.json_user_objects:
            user_query = User.query.filter_by(username=json_user_obj['username']).first()
            if not user_query:
                u = User(username=json_user_obj['username'], email=json_user_obj['email'], is_admin=json_user_obj['is_admin'])
                db.session.add(u)
            else:
                print(f'User {user_query} already exists')

        # db.session.commit()

        # at this point we should have the dataset and user objects
        # populated in the db and we should now do the relationships between then
        for json_ds_obj in self.json_dataset_objects:
            ds_obj = DataSet.query.filter_by(data_name=json_ds_obj['data_name']).first()
            if not ds_obj:
                print(f"Unable to find the DataSet object matching the data_name {json_ds_obj['data_name']}")
                continue
            # check to see if there is an authors list
            if json_ds_obj['authors']:
                # iterate through the authors list and search for the matching user object
                # if found then add to the dataset object
                for json_username in json_ds_obj['authors']:
                    u = User.query.filter_by(username=json_username).first()
                    if not u:
                        print(f'Unable to find User object matching user name {json_username}')
                    else:
                        # The add_author method instigates checks to see if the user
                        # object is already listed in the authors list of the
                        # dataset object
                        ds_obj.add_author(u)

        for json_user_obj in self.json_user_objects:
            user_obj = User.query.filter_by(username=json_user_obj['username']).first()
            if not user_obj:
                print(f"Unable to find the User object matching the data_name {json_user_obj['username']}")
                continue
            if json_user_obj['data_sets']:
                for json_study_to_load_str in json_user_obj['data_sets']:
                    ds_obj = DataSet.query.filter_by(study_to_load_str=json_study_to_load_str).first()
                    if not ds_obj:
                        print(f'Unable to find DataSet object matching data_name {json_study_to_load_str}')
                    else:
                        user_obj.add_dataset(ds_obj)

        db.session.commit()




pdbfj = PopulateDBFromJson()
pdbfj.populate_db()