from flask_wtf import FlaskForm
from wtforms import FloatField, StringField, validators
from wtforms.validators import InputRequired, NumberRange

class NewBothy(FlaskForm):
    #disabled CSRF protection so validation can run without flask key
    #after flask key is implemented delete next 2 lines
    class Meta:
        csrf = False
    BothyName = StringField('BothyName', validators=[ InputRequired(message="Include a bothy name.")
                                                    ])
    Longitude = FloatField('Longitude', validators=[ InputRequired(message="Include a valid longitude"),
                                                    NumberRange(min=-180.0, max=180.0, message="Longitude must be between -180 and 180."),
                                                    ])
    Latitude = FloatField('Latitude', validators=[ InputRequired(message="Include a latitude."),
                                                   NumberRange(min=-90.0, max=90.0, message="Latitude must be between -90 and 90."),
                                                   ])

def custom_validator_longitude(form, field):
    for val in field.data.rstrip(',').split(','):
        try:
            longitude = float(val)
        except ValueError:
            raise validators.ValidationError('Longitude must be numeric.')
        if longitude>180 or longitude<-180:
            raise validators.ValidationError('Longitude must be between -180 and 180.') 

def custom_validator_latitude(form, field):
    for val in field.data.rstrip(',').split(','):
        try:
            latitude = float(val)
        except ValueError:
            raise validators.ValidationError('Latitude must be numeric.')
        if latitude>90 or latitude<-90:
            raise validators.ValidationError('Latitude must be between -90 and 90.') 
    
class NewSite(FlaskForm):
    #disabled CSRF protection so validation can run without flask key
    #after flask key is implemented delete next 2 lines
    class Meta:
        csrf = False
    SiteName = StringField('SiteName', validators=[ InputRequired(message="Include a site name.")
                                                    ])
    Longitude = StringField('Longitude', validators=[custom_validator_longitude
                                                     ])
    Latitude = StringField('Latitude', validators=[custom_validator_latitude
                                                     ])
class SearchCircle(FlaskForm):
    #disabled CSRF protection so validation can run without flask key
    #after flask key is implemented delete next 2 lines
    class Meta:
        csrf = False
    Radius = FloatField('Radius', validators=[ InputRequired(message="Include a radius"),
                                                    NumberRange(min=0,max=100, message="Radius must be positive."),
                                                    ])                                                
    Longitude = FloatField('Longitude', validators=[ InputRequired(message="Include a valid longitude"),
                                                    NumberRange(min=-180.0, max=180.0, message="Longitude must be between -180 and 180."),
                                                    ])
    Latitude = FloatField('Latitude', validators=[ InputRequired(message="Include a latitude."),
                                                   NumberRange(min=-90.0, max=90.0, message="Latitude must be between -90 and 90."),
                                                   ])
