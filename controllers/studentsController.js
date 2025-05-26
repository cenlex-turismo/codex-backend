const Student = require("../models/student");
const User = require("../models/user");
const bcrypt = require('bcrypt');
const docx = require("docx");

const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    VerticalAlign,
    BorderStyle,
    HeadingLevel,
    ImageRun, // You'll need this if you implement actual images
    Header,
    ShadingType,
    PageBreak, // If needed for precise page control
    TextBoxContent,
    Drawing,
    Anchor,
    HorizontalPositionAlign,
    VerticalPositionAlign,
    convertInchesToTwip,
    FrameAnchorType
} = require("docx");
const fs = require("fs");

const createStudent = async (req, res) => {
    const { firstName, lastName, email, password, studentType } = req.body;
    var { idNumber } = req.body;

    try {

        if (studentType === '2') {
            do {
                idNumber = Math.floor(3000000000 + Math.random() * 1000000000);
                var existingStudent = await Student.findOne({ idNumber });
            } while (existingStudent);
        } else {
            const existingStudent = await Student.findOne({ idNumber });
            if (existingStudent) {
                return res.status(400).json({ message: 'Student with this ID already exists' });
            }
        }

        const currentDate = new Date();

        const student = await Student.create({
            idNumber: idNumber,
            lastModified: currentDate
        });

        const saltRounds = 10; // Number of salt rounds for bcrypt
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const user = await User.create({
            email: email,
            passwordHash: passwordHash,
            firstName: firstName,
            lastName: lastName,
            role: "student",
            studentDetails: student._id
        });

        res.json({ idNumber: idNumber });
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: 'An error occurred while creating the student', error: err.message });
    }
};

const getStudentByIdNumber = async (req, res) => {
    try {
        const idNumber = req.params.id;

        // First, find the student by idNumber
        const student = await Student.findOne({ idNumber });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Then find the user who references that student
        const user = await User.findOne({ studentDetails: student._id })
            .populate({
                path: 'studentDetails',
                populate: [
                    { path: 'courseGrades.course' },
                    { path: 'courseGrades.teacher' }
                ]
            })
            .exec();

        if (!user) {
            return res.status(404).json({ message: 'User with this student not found' });
        }

        // Return the found user
        res.status(200).json({ student: user, allowDownload: req.user.role !== "student" });
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while retrieving the student', error: err.message });
    }
};


const registerCourseGradeByIdNumber = async (req, res) => {
    try {
        const idNumber = req.params.id;
        const { course, score, courseStart, courseEnd, teacher } = req.body;

        // Find the student by idNumber
        const student = await Student.findOne({ idNumber: idNumber });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Check if the course already exists in the courseGrades array
        const existingGradeIndex = student.courseGrades.findIndex(grade => grade.course == course);

        if (existingGradeIndex !== -1) {
            // If the course already exists, update the score
            student.courseGrades[existingGradeIndex] = {
                course: course,
                score: score,
                courseStart: courseStart,
                courseEnd: courseEnd,
                teacher: teacher
            };
        } else {
            // If the course does not exist, add a new entry
            student.courseGrades.push({
                course: course,
                score: score,
                courseStart: courseStart,
                courseEnd: courseEnd,
                teacher: teacher
            });
        }

        // Update the student document in the database
        const currentDate = new Date();
        const studentUpdated = await Student.findOneAndUpdate({ idNumber: idNumber }, {
            $set: {
                courseGrades: student.courseGrades,
                lastModified: currentDate
            }
        }, { new: true });

        res.json(studentUpdated);

    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }
};

const maintenance = async (req, res) => {
    const years = parseInt(req.params.id, 10);

    try {
        const yearsAgo = new Date();
        yearsAgo.setFullYear(yearsAgo.getFullYear() - years);

        // Find students to be deleted
        const studentsToDelete = await Student.find({
            lastModified: { $lt: yearsAgo }
        });

        const studentIds = studentsToDelete.map(student => student._id);

        // Delete related users
        const userResult = await User.deleteMany({
            studentDetails: { $in: studentIds }
        });

        // Delete the students
        const studentResult = await Student.deleteMany({
            _id: { $in: studentIds }
        });

        res.json({
            message: `Deleted ${studentResult.deletedCount} student(s) and ${userResult.deletedCount} related user(s) older than ${years} year(s).`
        });
    } catch (err) {
        res.status(500).json({
            message: "An error occurred during maintenance",
            error: err.message
        });
    }
};

const filterStudents = async (req, res) => {
    try {
        const { idNumber, firstName, lastName, course, score, scoreCondition, courseStart, courseStartCondition, courseEnd, courseEndCondition, teacher } = req.query;

        // Build the student query
        const studentQuery = {};

        if (idNumber !== "") {
            studentQuery.$expr = {
                $regexMatch: {
                    input: { $toString: "$idNumber" },
                    regex: idNumber,
                    options: "i",
                },
            };
        }

        // Build courseGrades query
        const courseGradesQuery = {};

        if (course !== "") {
            courseGradesQuery.course = course;
        }

        if (score !== "") {
            switch (scoreCondition) {
                case "equal":
                    courseGradesQuery.score = { $eq: Number(score) };
                    break;
                case "greater":
                    courseGradesQuery.score = { $gt: Number(score) };
                    break;
                case "less":
                    courseGradesQuery.score = { $lt: Number(score) };
                    break;
                default:
                    courseGradesQuery.score = Number(score);
            }
        }

        if (courseStart !== "") {
            switch (courseStartCondition) {
                case "equal":
                    courseGradesQuery.courseStart = { $eq: new Date(courseStart) };
                    break;
                case "greater":
                    courseGradesQuery.courseStart = { $gt: new Date(courseStart) };
                    break;
                case "less":
                    courseGradesQuery.courseStart = { $lt: new Date(courseStart) };
                    break;
                default:
                    courseGradesQuery.courseStart = new Date(courseStart);
            }
        }

        if (courseEnd !== "") {
            switch (courseEndCondition) {
                case "equal":
                    courseGradesQuery.courseEnd = { $eq: new Date(courseEnd) };
                    break;
                case "greater":
                    courseGradesQuery.courseEnd = { $gt: new Date(courseEnd) };
                    break;
                case "less":
                    courseGradesQuery.courseEnd = { $lt: new Date(courseEnd) };
                    break;
                default:
                    courseGradesQuery.courseEnd = new Date(courseEnd);
            }
        }

        if (teacher !== "") {
            courseGradesQuery.teacher = teacher;
        }

        if (Object.keys(courseGradesQuery).length > 0) {
            studentQuery.courseGrades = { $elemMatch: courseGradesQuery };
        }

        // Find students matching the studentQuery
        const students = await Student.find(studentQuery);

        // Get the IDs of the matching students
        const studentIds = students.map(student => student._id);

        // Now build the User query
        const userQuery = !students.length ? {
            role: "student"
        } : {
            role: "student",
            studentDetails: { $in: studentIds }
        }

        if (firstName !== "") {
            userQuery.firstName = { $regex: firstName, $options: 'i' };
        }

        if (lastName !== "") {
            userQuery.lastName = { $regex: lastName, $options: 'i' };
        }

        // Find users matching the userQuery and populate the studentDetails
        const users = await User.find(userQuery)
            .populate('studentDetails')
            .exec();

        if (!users.length) {
            return res.status(404).json({ message: 'No users found matching the given criteria' });
        }

        res.status(200).json({ students: users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An error occurred while filtering students', error: err.message });
    }
};

const generateTranscript = async (req, res) => {
    try {
        // Extract the student ID from the request parameters
        const idNumber = req.params.id;

        // Fetch student data
        const student = await Student.findOne({ idNumber }).populate({
            path: "courseGrades.course",
            model: "Course",
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Fetch user data for the student
        const user = await User.findOne({ studentDetails: student._id });

        if (!user) {
            return res.status(404).json({ message: "User data for student not found" });
        }

        // Assuming student data might come from req.body or other sources
        // For this example, using placeholders as in the document
        const studentName = user.lastName + " " + user.firstName; // Placeholder from [cite: 3]
        const studentId = idNumber; // Placeholder from [cite: 3]
        const now = new Date();

        const day = now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit' });
        const month = now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', month: 'long' });
        const currentYear = now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric' });

        const children = [];
        const childrenHeader = [];

        // --- IMAGE PLACEHOLDERS (TOP OF PAGE) ---
        // Replace these with actual ImageRun objects when you have images.
        // Example:
        try {
            childrenHeader.push(new Paragraph({
                children: [
                    new ImageRun({
                        data: fs.readFileSync("./assets/word_background.png"),
                        transformation: { width: 816, height: 1056 }, // Adjust size as needed
                        floating: {
                            horizontalPosition: {
                                align: "center",
                            },
                            verticalPosition: {
                                align: "center",
                            },
                            behindDocument: true,
                        },
                    }),
                ],
                alignment: AlignmentType.CENTER, // Or use a table for precise side-by-side logo placement
            }));
            childrenHeader.push(new Paragraph({
                alignment: AlignmentType.RIGHT,
                frame: {
                    position: {
                        x: 6450,
                        y: -500,
                    },
                    width: 4000,
                    height: 1000,
                    anchor: {
                        horizontal: FrameAnchorType.MARGIN,
                        vertical: FrameAnchorType.MARGIN,
                    },
                    alignment: {
                        x: HorizontalPositionAlign.CENTER,
                        y: VerticalPositionAlign.TOP,
                    },
                },
                border: {
                    top: {
                        color: "auto",
                        space: 1,
                        value: "single",
                        size: 6,
                    },
                    bottom: {
                        color: "auto",
                        space: 1,
                        value: "single",
                        size: 6,
                    },
                    left: {
                        color: "auto",
                        space: 1,
                        value: "single",
                        size: 6,
                    },
                    right: {
                        color: "auto",
                        space: 1,
                        value: "single",
                        size: 6,
                    },
                },
                children: [
                    new TextRun({ text: "Secretaría Académica", bold: true, font: "Noto Sans SemiBold", size: 16, break: 1 }),
                    new TextRun({ text: "Dirección de Educación Superior", bold: true, font: "Noto Sans SemiBold", size: 16, break: 1 }),
                    new TextRun({ text: "", bold: true, font: "Noto Sans SemiBold", size: 16, break: 1 }),
                    new TextRun({ text: "Escuela Superior de Turismo", bold: true, font: "Noto Sans SemiBold", size: 16 }),
                ],
            }));
        } catch (e) {
            console.log(e);
            console.warn("Placeholder image not found. Skipping image.");
            childrenHeader.push(new Paragraph({ text: "<<< Placeholder: University/Institution Logo (e.g., Left Aligned) >>>", alignment: AlignmentType.CENTER }));
            childrenHeader.push(new Paragraph({ text: "<<< Placeholder: Another Logo (e.g., Right Aligned) >>>", alignment: AlignmentType.CENTER }));
        }

        // --- Folio and Asunto --- [cite: 1]
        // Source [cite: 1] shows "Folio" then its value, then "Asunto" then its value.
        // These might be right-aligned in the original document or part of a header.
        // For simplicity, using left-aligned paragraphs here. Add alignment: AlignmentType.RIGHT if needed.
        children.push(new Paragraph({ children: [new TextRun({ text: "Folio", bold: true, font: "Geomanist", size: 18 })] }));
        children.push(new Paragraph({ children: [new TextRun({ text: "CELEXEST-HAIXXX-2025", font: "Geomanist", size: 18 })] }));
        children.push(new Paragraph("")); // Spacing
        children.push(new Paragraph({ children: [new TextRun({ text: "Asunto", font: "Geomanist", size: 18 })] }));
        children.push(new Paragraph({ children: [new TextRun({ text: "Historial Académico", bold: true, font: "Geomanist", size: 18 })] }));
        children.push(new Paragraph("")); // Spacing

        // --- Addressee --- [cite: 1]
        children.push(new Paragraph({ children: [new TextRun({ text: "A QUIEN CORRESPONDA:", bold: true, font: "Geomanist", size: 18 })], alignment: AlignmentType.LEFT }));
        children.push(new Paragraph("")); // Spacing
        children.push(new Paragraph("")); // Spacing

        // --- Introductory Paragraph --- [cite: 3]
        children.push(new Paragraph({
            children: [
                new TextRun({ text: "               Con base en la documentación que obra en los expedientes de los Cursos Extracurriculares de Lenguas Extranjeras (CELEX), hace constar que la ", font: "Geomanist", size: 18 }),
                new TextRun({ text: "C. " + studentName, bold: true, font: "Geomanist", size: 18 }), // [cite: 3]
                new TextRun({ text: " con número de boleta ", font: "Geomanist", size: 18 }),
                new TextRun({ text: studentId, bold: true, font: "Geomanist", size: 18 }), // [cite: 3]
                new TextRun({ text: " concluyó los estudios del programa del idioma Inglés de esta Unidad Académica cómo a continuación se detalla:", font: "Geomanist", size: 18 }), // [cite: 3]
            ],
            alignment: AlignmentType.BOTH, // Justified
        }));
        children.push(new Paragraph("")); // Spacing

        // Define static course map to keep order
        const orderedModules = [
            { level: 0, module: 1, name: "Introductorio", mcer: "A1" },

            { level: 1, module: 1, name: "Básico 1", mcer: "A1" },
            { level: 1, module: 2, name: "Básico 2", mcer: "A1" },
            { level: 1, module: 3, name: "Básico 3", mcer: "A2" },
            { level: 1, module: 4, name: "Básico 4", mcer: "A2" },
            { level: 1, module: 5, name: "Básico 5", mcer: "A2" },

            { level: 2, module: 1, name: "Intermedio 1", mcer: "B1" },
            { level: 2, module: 2, name: "Intermedio 2", mcer: "B1" },
            { level: 2, module: 3, name: "Intermedio 3", mcer: "B1" },
            { level: 2, module: 4, name: "Intermedio 4", mcer: "B1" },
            { level: 2, module: 5, name: "Intermedio 5", mcer: "B1" },

            { level: 3, module: 1, name: "Avanzado 1", mcer: "B2" },
            { level: 3, module: 2, name: "Avanzado 2", mcer: "B2" },
            { level: 3, module: 3, name: "Avanzado 3", mcer: "B2" },
            { level: 3, module: 4, name: "Avanzado 4", mcer: "B2" },
            { level: 3, module: 5, name: "Avanzado 5", mcer: "B2" },
            { level: 3, module: 6, name: "Avanzado 6", mcer: "B2" }
        ];

        // Header row
        const academicHistoryData = [
            [
                { text: "MÓDULO", bold: true },
                { text: "NIVEL MCER", bold: true },
                { text: "CURSO", bold: true },
                { text: "PERIODO", bold: true },
                { text: "HORAS", bold: true },
                { text: "CALIFICACIÓN", bold: true }
            ]
        ];

        // Build a quick lookup map of English course grades
        const englishGrades = student.courseGrades.filter(grade => grade.course?.language === "Ingles");
        const courseMap = {};
        englishGrades.forEach(grade => {
            const key = `${grade.course.level}-${grade.course.module}`;
            courseMap[key] = grade;
        });

        let totalHours = 0;

        orderedModules.forEach(mod => {
            const key = `${mod.level}-${mod.module}`;
            const grade = courseMap[key];

            if (grade) {
                const period = grade.courseStart && grade.courseEnd
                    ? `${grade.courseStart.toLocaleDateString('es-MX')} al ${grade.courseEnd.toLocaleDateString('es-MX')}`
                    : "---";

                academicHistoryData.push([
                    mod.name,
                    mod.mcer,
                    "Sabatino",
                    period,
                    "40",
                    grade.score?.toString() ?? "---"
                ]);

                totalHours += 40;
            } else {
                academicHistoryData.push([
                    mod.name,
                    mod.mcer,
                    "---",
                    "---",
                    "---",
                    "---"
                ]);
            }
        });

        // Add total row
        academicHistoryData.push([
            { text: "", colSpan: 3 },
            { text: "Total de horas:" }, { text: totalHours.toString(), bold: true }, "---"
        ]);

        academicHistoryData.push([
            { text: "Programa registrado ante la Dirección de Formación en Lenguas Extranjeras con el número: DFLE-PGII-CELEXEST1-24", colSpan: 6, bold: true }
        ]);


        const academicHistoryTable = new Table({
            columnWidths: [2000, 1500, 2500, 3000, 1000, 1500], // Adjust widths as needed
            alignment: AlignmentType.CENTER,
            rows: academicHistoryData.map((rowData, rowIndex) => {
                const cells = [];
                rowData.forEach(cellData => {
                    let textContent = "";
                    const textRuns = [];
                    let columnSpan;
                    let cellAlignment = AlignmentType.CENTER; // Center headers, left-align data
                    let isBold = (rowIndex === 0); // Headers are bold by default

                    if (typeof cellData === 'object' && cellData !== null) {
                        textContent = cellData.text;
                        if (cellData.bold) isBold = true;
                        if (cellData.colSpan) columnSpan = cellData.colSpan;
                        if (cellData.align) cellAlignment = cellData.align;
                    } else {
                        textContent = String(cellData);
                    }
                    textRuns.push(new TextRun({ text: textContent, bold: isBold, font: "Geomanist", size: 18 }));

                    cells.push(new TableCell({
                        children: [new Paragraph({ children: textRuns, alignment: cellAlignment })],
                        columnSpan: columnSpan,
                        verticalAlign: VerticalAlign.CENTER,
                        borders: { // Example: add all borders
                            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        }
                    }));
                });
                return new TableRow({ children: cells, tableHeader: rowIndex === 0 });
            }),
        });
        children.push(academicHistoryTable);

        // --- Legal Basis --- [cite: 3]
        children.push(new Paragraph({
            children: [
                new TextRun({ text: "*Con fundamento en el apartado VI DE LOS USUARIOS DE LOS SERVICIOS EDUCATIVOS COMPLEMENTARIOS, numeral 7 y/o 8.", font: "Geomanist", size: 18 }),
            ],
        }));

        // --- Level Confirmation --- [cite: 3]
        children.push(new Paragraph({
            children: [
                new TextRun({ text: "El historial muestra que la usuaria ha concluido los estudios correspondientes al nivel ", font: "Geomanist", size: 18 }),
                new TextRun({ text: "B2", font: "Geomanist", size: 18, bold: true }),
                new TextRun({ text: " de acuerdo con el Marco Común Europeo de Referencia para las Lenguas (MCER).", font: "Geomanist", size: 18 })
            ],
            alignment: AlignmentType.BOTH
        }));

        children.push(new Paragraph({
            children: [
                new TextRun({ text: `A petición de la interesada y para los fines académicos que considere convenientes, se extiende la presente en la Ciudad de México a los ${day} días del mes de ${month} del ${currentYear}.`, font: "Geomanist", size: 18 })
            ],
            alignment: AlignmentType.BOTH
        }));

        children.push(new Paragraph({
            children: [
                new TextRun({ text: "ATENTAMENTE", font: "Geomanist", size: 18, bold: true })
            ],
            alignment: AlignmentType.CENTER
        }));

        children.push(new Paragraph({
            children: [
                new TextRun({ text: "“LA TÉCNICA AL SERVICIO DE LA PATRIA”", font: "Geomanist", size: 18, bold: true })
            ],
            alignment: AlignmentType.CENTER
        }));

        // Hasta aqui vamos mas o menos bien

        // --- Signatories ---
        // As per sources[cite: 5, 6, 7], each signatory block is listed, then repeated.
        const signatoryDetails = [
            { title: "LIC.", name: "NAYELI SERRANO FERNÁNDEZ", role: ["SUBDIRECTORA DE SERVICIOS EDUCATIVOS", "E INTEGRACIÓN SOCIAL INTERINA"] }, // [cite: 5]
            { title: "LIC.", name: "NAYELI SERRANO FERNÁNDEZ", role: ["SUBDIRECTORA DE SERVICIOS EDUCATIVOS", "E INTEGRACIÓN SOCIAL INTERINA"] }, // [cite: 6]
            { title: "M. EN C.", name: "ZADITH ILIANA RAJIN VILCHIS", role: ["SUBDIRECTORA ACADÉMICA INTERINA"] }, // [cite: 6]
            { title: "M. EN C.", name: "ZADITH ILIANA RAJIN VILCHIS", role: ["SUBDIRECTORA ACADÉMICA INTERINA"] }, // [cite: 6]
            { title: "DRA.", name: "MARISSA ALONSO MARBÁN", role: ["DIRECTORA"] }, // [cite: 7]
            { title: "DRA.", name: "MARISSA ALONSO MARBÁN", role: ["DIRECTORA"] }, // [cite: 7]
        ];

        signatoryDetails.forEach(sig => {
            if (sig.title) children.push(new Paragraph({ text: sig.title, alignment: AlignmentType.CENTER }));
            children.push(new Paragraph({ text: sig.name, alignment: AlignmentType.CENTER, bold: true }));
            sig.role.forEach(roleLine => {
                children.push(new Paragraph({ text: roleLine, alignment: AlignmentType.CENTER }));
            });
            children.push(new Paragraph("")); // Space after each signatory block
        });
        children.push(new Paragraph("")); // Extra space after all signatories

        // --- CEFR Competencies Title --- [cite: 7]
        children.push(new Paragraph({
            text: "COMPETENCIAS EN FUNCIÓN DEL NIVEL DE DOMINIO DE ACUERDO CON EL MARCO COMÚN EUROPEO DE REFERENCIA",
            alignment: AlignmentType.CENTER,
            bold: true,
        }));
        children.push(new Paragraph("")); // Spacing

        // --- TABLE 2: CEFR Competencies --- [cite: 8]
        const cefrData = [
            // Data from[cite: 8]. Columns: (empty), LEVEL, (empty), DESCRIPTION 1, DESCRIPTION 2
            [null, "C2", null, "Es capaz de comprender con facilidad prácticamente todo lo que oye o lee. Sabe reconstruir la información y los argumentos procedentes de diversas fuentes, ya sean en lengua hablada o escrita, y presentarlos de manera coherente y resumida.", "Puede expresarse espontáneamente, con gran fluidez y con grado de precisión que le permite diferenciar pequeños matices de significado incluso en situaciones de mayor complejidad."],
            [null, "C1", null, "Es capaz de comprender una amplia variedad de textos extensos y con cierto nivel de exigencia, así como reconocer en ellos sentidos implícitos. Sabe expresarse de forma fluida y espontanea sin muestras muy evidentes de esfuerzo para encontrar la expresión adecuada. Puede hacer un uso flexible y efectivo del idioma para fines sociales, académicos y profesionales.", "Puede producir textos claros, bien estructurados y detallados sobre temas de cierta complejidad, mostrando un uso correcto de los mecanismos de organización, articulación y cohesión del texto."],
            [null, "B2", null, "Es capaz de entender las ideas principales de textos complejos que traten de temas tanto concretos como abstractos, incluso si son de carácter técnico, siempre que estén dentro de su campo de especialización. Puede relacionarse con hablantes nativos con un grado suficiente de fluidez y naturalidad, de modo que la comunicación se realice sin esfuerzo por parte de los interlocutores.", "Puede producir textos claros y detallados sobre temas diversos, así como defender un punto de vista sobre temas generales, indicando los pros y los contras de las distintas opciones."],
            [null, "B1", null, "Es capaz de comprender los puntos principales de textos claros y en lengua estándar si tratan sobre cuestiones que le son conocidas, ya sea en situaciones de trabajo, de estudio o de ocio. Sabe desenvolverse en la mayor parte de las situaciones que pueden surgir durante un viaje por zonas donde se utiliza la lengua. Es capaz de producir textos sencillos y coherentes sobre temas que le son familiares o en los que tiene un interés personal. Puede describir experiencias, acontecimientos, deseos y aspiraciones, así como justificar brevemente sus opiniones o explicar sus planes."],
            [null, "A2", null, "Es capaz de comprender frases y expresiones de uso frecuente relacionadas con áreas de experiencia que le son especialmente relevantes (información básica sobre sí mismo y su familia, compras, lugares de interés, ocupaciones, etc.).", "Sabe comunicarse a la hora de llevar a cabo tareas simples y cotidianas que no requieren más que intercambios sencillos y directos de información sobre cuestiones que le son conocidas o habituales. Sabe describir en términos sencillos aspectos de su pasado y su entorno, así como cuestiones relacionadas con sus necesidades inmediatas."],
            [null, "A1", null, "Es capaz de comprender y utilizar expresiones cotidianas de uso muy frecuente, así como, frases sencillas destinadas a satisfacer necesidades de tipo inmediato. Puede presentarse a sí mismo y a otros, pedir y dar información personal básica sobre domicilio, sus pertenencias y las personas que conoce. Puede relacionarse de forma elemental siempre que su interlocutor hable despacio y con claridad y esté dispuesto a cooperar."],
        ];

        const cefrTable = new Table({
            columnWidths: [500, 1000, 500, 5500, 5500], // Adjust widths: empty, level, empty, desc1, desc2
            rows: cefrData.map(rowData => {
                return new TableRow({
                    children: rowData.map((cellContent, cellIndex) => {
                        const text = cellContent !== null ? String(cellContent) : "";
                        const isLevelColumn = cellIndex === 1;
                        const paragraphChildren = [new TextRun({ text: text, bold: isLevelColumn })];

                        return new TableCell({
                            children: [new Paragraph({
                                children: paragraphChildren,
                                alignment: isLevelColumn ? AlignmentType.CENTER : AlignmentType.BOTH, // Center level, justify descriptions
                            })],
                            verticalAlign: VerticalAlign.CENTER,
                            borders: { // Example: add all borders
                                top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                                bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                                left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                                right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                            }
                        });
                    }),
                });
            }),
        });
        children.push(cefrTable);
        children.push(new Paragraph("")); // Spacing

        // --- IMAGE PLACEHOLDERS (BOTTOM OF PAGE) ---
        children.push(new Paragraph({ text: "<<< Placeholder: Official Seal / Additional Logos (Bottom) >>>", alignment: AlignmentType.CENTER }));

        // --- Document Creation ---
        const doc = new Document({
            creator: "CELEXEST", // [cite: 1] (Implied by Folio prefix)
            title: "Historial Académico", // [cite: 1]
            description: "Historial Académico del alumno",
            sections: [{
                properties: { // Add page margins, size, etc. if needed
                    page: {
                        size: {
                            width: 12234, // Use predefined width for Letter
                            height: 15832, // Use predefined height for Letter
                        },
                        margin: {
                            top: 2591, bottom: 1984, left: 1134, right: 1043 // 0.5 inch in twentieths of a point
                        },
                    },
                },
                headers: { // Example if Folio/Asunto were in a header
                    default: new Header({
                        children: childrenHeader
                    }),
                },
                children: children,
            }],
        });

        // Generate and send the Word document
        const buffer = await Packer.toBuffer(doc);
        res.setHeader("Content-Disposition", "attachment; filename=transcript.docx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.send(buffer);
    } catch (error) {
        console.error("Error generating transcript:", error);
        res.status(500).json({ message: "An error occurred while generating the transcript." });
    }
};

module.exports = {
    createStudent: createStudent,
    getStudentByIdNumber: getStudentByIdNumber,
    registerCourseGradeByIdNumber: registerCourseGradeByIdNumber,
    maintenance: maintenance,
    filterStudents: filterStudents,
    generateTranscript: generateTranscript
}