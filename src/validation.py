from flask_wtf import FlaskForm
from wtforms import FloatField, StringField
from wtforms.validators import InputRequired, NumberRange

class NewBothy(FlaskForm):
    class Meta:
        csrf = False
    name = StringField('BothyName', validators=[ InputRequired(message="Include a name.")]
    )