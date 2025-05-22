# /Project/backend/Routes/config/forms.py
from flask_wtf import FlaskForm
from wtforms import (
    StringField,
    PasswordField,
    SubmitField,
    DateField,
    SelectField,
    TextAreaField,
    IntegerField,
    FloatField,
    BooleanField,
)
from wtforms.validators import (
    DataRequired,
    Length,
    Email,
    Regexp,
    NumberRange,
    Optional,
)


class RegistroUsuarioForm(FlaskForm):
    # Usuario
    username = StringField(
        "Email",
        validators=[DataRequired(), Email(message="Debe ingresar un correo válido")],
    )
    password = PasswordField("Contraseña", validators=[DataRequired()])

    # Persona
    nombre = StringField(
        "Nombre",
        validators=[
            DataRequired(),
            Length(min=3, message="El nombre debe tener al menos 3 letras"),
            Regexp(r"^[A-Za-zÀ-ÿ\s]+$", message="Solo se permiten letras y espacios"),
        ],
    )
    apellido = StringField(
        "Apellido",
        validators=[
            DataRequired(),
            Length(min=3, message="El apellido debe tener al menos 3 letras"),
            Regexp(r"^[A-Za-zÀ-ÿ\s]+$", message="Solo se permiten letras y espacios"),
        ],
    )

    dni = StringField(
        "DNI",
        validators=[
            DataRequired(),
            Regexp(
                r"^\d{8,}$", message="El DNI debe tener al menos 8 dígitos numéricos"
            ),
        ],
    )

    cumpleanios = DateField(
        "Cumpleaños", format="%Y-%m-%d", validators=[DataRequired()]
    )

    # Campo
    nombre_campo = StringField(
        "Nombre del campo",
        validators=[
            DataRequired(),
            Length(min=3, message="El nombre del campo debe tener al menos 3 letras"),
        ],
    )

    descripcion_campo = StringField(
        "Descripción del campo",
        validators=[
            Length(
                max=100, message="La descripción no puede exceder los 100 caracteres"
            ),
        ],
    )

    submit = SubmitField("Registrar")


class RegistroCampoForm(FlaskForm):
    # Campo
    nombre_campo = StringField(
        "Nombre del campo",
        validators=[
            DataRequired(),
            Length(min=3, message="El nombre del campo debe tener al menos 3 letras"),
        ],
    )

    descripcion_campo = StringField(
        "Descripción del campo",
        validators=[
            Length(
                max=100, message="La descripción no puede exceder los 100 caracteres"
            ),
        ],
    )

    submit = SubmitField("Registrar")


class RegistroParcelaForm(FlaskForm):
    nombre_parcela = StringField(
        "Nombre del Área",
        validators=[
            DataRequired(),
            Length(min=3, message="El nombre del campo debe tener al menos 3 letras"),
        ],
    )
    descripcion_parcela = StringField(
        "Descripción de la parcela",
        validators=[
            Length(
                max=100, message="La descripción no puede exceder los 100 caracteres"
            ),
        ],
    )
    campo_id = SelectField(
        "Campo",
        validators=[DataRequired()],
        choices=[("default", "Seleccione un Campo")],
    )
    perimetro_geojson = TextAreaField("GeoJSON", validators=[DataRequired()])
    submit = SubmitField("Crear Parcela")


class RegistroCollarForm(FlaskForm):
    cantidad_collares = IntegerField(
        "Cantidad de collares",
        validators=[
            NumberRange(min=1, max=50, message="Cantidad inválida (1 a 50)"),
            DataRequired(),
        ],
    )
    submit = SubmitField("Cargar Collares")


class RegistroAnimalForm(FlaskForm):
    # Identificación básica
    nombre = StringField(
        "Nombre",
        validators=[
            DataRequired(message="Este campo es obligatorio."),
            Length(min=3, message="El nombre debe tener al menos 3 letras."),
            Regexp(r"^[A-Za-zÀ-ÿ\s]+$", message="Solo se permiten letras y espacios."),
        ],
    )
    raza = SelectField(
        "Raza",
        choices=[
            ("Angus", "Angus"),
            ("Hereford", "Hereford"),
            ("Brangus", "Brangus"),
            ("Brahman", "Brahman"),
            ("Braford", "Braford"),
            ("Limousin", "Limousin"),
            ("Criollo", "Criollo"),
        ],
        validators=[
            DataRequired(message="Seleccione la raza del animal."),
            Length(min=2, message="La raza debe tener al menos 2 caracteres."),
        ],
    )
    sexo = SelectField(
        "Sexo",
        choices=[("Macho", "Macho"), ("Hembra", "Hembra")],
        validators=[DataRequired(message="Seleccione el sexo del animal.")],
    )
    fecha_nacimiento = DateField(
        "Fecha de Nacimiento",
        format="%Y-%m-%d",
        validators=[DataRequired("Seleccione el nacimiento del animal.")],
    )

    # Zoometría
    peso = FloatField(
        "Peso (kg)",
        validators=[
            DataRequired("Seleccione el peso del animal."),
            NumberRange(min=0, message="El peso debe ser positivo."),
        ],
    )
    altura_cruz = FloatField(
        "Altura a la cruz (cm)", validators=[Optional(), NumberRange(min=0)]
    )
    longitud_tronco = FloatField(
        "Longitud del tronco (cm)", validators=[Optional(), NumberRange(min=0)]
    )
    perimetro_toracico = FloatField(
        "Perímetro torácico (cm)", validators=[Optional(), NumberRange(min=0)]
    )
    ancho_grupa = FloatField(
        "Ancho de grupa (cm)", validators=[Optional(), NumberRange(min=0)]
    )
    longitud_grupa = FloatField(
        "Longitud de grupa (cm)", validators=[Optional(), NumberRange(min=0)]
    )

    # Reproducción
    estado_reproductivo = SelectField(
        "Estado Reproductivo",
        choices=[("Preñada", "Preñada"), ("Vacía", "Vacía"), ("Activo", "Activo")],
        validators=[DataRequired()],
    )
    numero_partos = IntegerField(
        "Número de Partos", validators=[Optional(), NumberRange(min=0)]
    )
    intervalo_partos = IntegerField(
        "Intervalo entre partos (días)", validators=[Optional(), NumberRange(min=0)]
    )
    fertilidad = FloatField(
        "Fertilidad (%)", validators=[Optional(), NumberRange(min=0, max=100)]
    )
    ubicacion_sensor = SelectField(
        "Ubicación anatómica del sensor",
        choices=[("Cuello", "Cuello"), ("Muñeca", "Muñeca")],
        validators=[DataRequired(message="Seleccione la ubicación del sensor.")],
    )

    # Relacionales
    parcela_id = SelectField(
        "Parcela",
        coerce=int,
        validators=[DataRequired(message="Seleccione una parcela.")],
    )
    collar_id = SelectField(
        "Collar", coerce=int, validators=[DataRequired(message="Seleccione un collar.")]
    )

    submit = SubmitField("Registrar Animal")


class RegistroCaracteristicasForm(FlaskForm):
    # Índices
    indice_corporal = FloatField("Índice Corporal", validators=[Optional(), NumberRange(min=0)])
    indice_toracico = FloatField("Índice Torácico", validators=[Optional(), NumberRange(min=0)])
    indice_cefalico = FloatField("Índice Cefálico", validators=[Optional(), NumberRange(min=0)])

    # Morfología
    perfil = StringField("Perfil", validators=[Optional(), Length(min=2), Regexp(r'^[\w\sáéíóúÁÉÍÓÚñÑ.,-]*$', message="Solo letras, números y signos básicos")])
    cabeza = StringField("Cabeza", validators=[Optional(), Length(min=2)])
    cuello = StringField("Cuello", validators=[Optional(), Length(min=2)])
    grupa = StringField("Grupa", validators=[Optional(), Length(min=2)])
    orejas = StringField("Orejas", validators=[Optional(), Length(min=2)])
    ubre = StringField("Ubre / Pezones", validators=[Optional(), Length(min=2)])
    testiculos = StringField("Testículos", validators=[Optional(), Length(min=2)])
    pelaje = StringField("Tipo y color de pelaje", validators=[Optional(), Length(min=2)])
    cuernos = BooleanField("¿Tiene cuernos?")
    pezuñas = StringField("Pezuñas", validators=[Optional(), Length(min=2)])
    mucosas = StringField("Color de mucosas / ojos", validators=[Optional(), Length(min=2)])

    # Funcionalidad
    bcs = IntegerField("Condición corporal (1-5)", validators=[Optional(), NumberRange(min=1, max=5)])
    locomocion = StringField("Locomoción", validators=[Optional(), Length(min=2)])
    comportamiento = StringField("Comportamiento", validators=[Optional(), Length(min=2)])

    # Selector de animal relacionado
    animal_id = SelectField("Seleccionar Animal", coerce=int, validators=[Optional()])

    submit = SubmitField("Guardar características")