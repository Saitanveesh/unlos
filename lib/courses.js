'use strict';

const lesson = (id, title, minutes, lead, sections, quiz) => ({ id, title, minutes, lead, sections, quiz });
const section = (heading, body, bullets) => ({ heading, body, bullets: bullets || [] });
const courses = [
  {
    id: 'web', slug: 'web-development', title: 'Web Development Fundamentals', category: 'Development', level: 'Beginner', duration: '4 hours', icon: 'code', accent: 'violet',
    description: 'Learn how websites work and build your first pages with HTML, CSS and JavaScript.',
    outcomes: ['Structure a page using HTML', 'Style layouts with CSS', 'Add interaction using JavaScript'],
    lessons: [
      lesson('web-1', 'How the web works', 15, 'Start with the three parts of a modern website.', [
        section('Client and server', 'When you open a website, the browser requests files from a server. The server sends HTML, CSS and JavaScript for the browser to display.'),
        section('The three building blocks', 'Each language has a different job.', ['HTML defines the content and structure.', 'CSS controls layout, colors and typography.', 'JavaScript makes the interface interactive.'])
      ], { question: 'Which language is mainly responsible for the structure of a webpage?', options: ['CSS', 'HTML', 'JavaScript', 'SQL'], answer: 1, explanation: 'HTML describes the structure and elements of a webpage.' }),
      lesson('web-2', 'Write your first HTML page', 25, 'Build the basic document structure.', [
        section('HTML elements', 'An HTML document uses tags for headings, paragraphs, links, images and other elements.'),
        section('A simple example', 'Create a document with a heading and a paragraph.', ['Use <h1> for the main page heading.', 'Use <p> for a paragraph.', 'Use <a> to create a link.'])
      ], { question: 'Which HTML element represents a paragraph?', options: ['<h1>', '<p>', '<main>', '<style>'], answer: 1, explanation: 'The <p> element is for paragraph text.' }),
      lesson('web-3', 'Style with CSS', 30, 'Make a page readable and visually consistent.', [
        section('Selectors and properties', 'CSS applies visual rules to selected HTML elements. A rule includes a selector and declarations.'),
        section('A flexible layout', 'Flexbox and Grid help you arrange elements across different screen sizes.', ['Use margin and padding for spacing.', 'Use display: grid for card layouts.', 'Use media queries for mobile screens.'])
      ], { question: 'Which CSS property controls the text color?', options: ['background', 'color', 'display', 'border'], answer: 1, explanation: 'The color property sets the foreground text color.' }),
      lesson('web-4', 'Add JavaScript interaction', 30, 'Respond to user actions.', [
        section('Events', 'JavaScript listens for events such as clicks, typing and form submissions.'),
        section('Updating a page', 'The DOM lets JavaScript read and modify page content.', ['Select an element with document.querySelector().', 'Listen to clicks using addEventListener().', 'Update textContent to display a result.'])
      ], { question: 'Which method attaches an event listener?', options: ['addEventListener()', 'queryDatabase()', 'createStylesheet()', 'fetchPage()'], answer: 0, explanation: 'addEventListener registers a function to handle an event.' })
    ]
  },
  {
    id: 'python', slug: 'python-essentials', title: 'Python for Beginners', category: 'Programming', level: 'Beginner', duration: '3 hours', icon: 'terminal', accent: 'blue',
    description: 'Get comfortable with Python syntax, variables, decisions and loops through clear examples.',
    outcomes: ['Read and write simple Python', 'Use conditions and loops', 'Create reusable functions'],
    lessons: [
      lesson('py-1', 'Your first Python program', 18, 'Learn what Python is and how statements run.', [
        section('Python basics', 'Python is a general-purpose programming language commonly used for automation, web services and data analysis.'),
        section('Write a statement', 'The print() function shows information in the terminal.', ['Run print("Hello, world!") to display a message.', 'Use # at the start of a comment.', 'Indentation is part of Python syntax.'])
      ], { question: 'Which Python function prints text?', options: ['echo()', 'show()', 'print()', 'display()'], answer: 2, explanation: 'print() outputs text to the console.' }),
      lesson('py-2', 'Variables and data types', 22, 'Store and work with values.', [
        section('Naming values', 'Variables point to values such as numbers, strings and booleans.'),
        section('Common types', 'You can combine values to calculate or build text.', ['int for whole numbers.', 'float for decimal numbers.', 'str for text.', 'bool for True or False.'])
      ], { question: 'Which data type stores text in Python?', options: ['int', 'str', 'bool', 'float'], answer: 1, explanation: 'str represents strings such as names and sentences.' }),
      lesson('py-3', 'Conditions and loops', 27, 'Make decisions and repeat tasks.', [
        section('Control flow', 'Use if and else statements to select which code runs.'),
        section('Looping', 'A for loop repeats over a sequence; a while loop repeats while a condition is true.', ['if checks a condition.', 'for item in items iterates through values.', 'while keeps running until its condition becomes false.'])
      ], { question: 'Which Python keyword starts a conditional branch?', options: ['when', 'if', 'caseof', 'test'], answer: 1, explanation: 'if is the standard conditional keyword in Python.' }),
      lesson('py-4', 'Functions and practice', 24, 'Organize reusable logic.', [
        section('Defining a function', 'Use def to define a named block of code that may accept parameters.'),
        section('Returning a value', 'return sends a value back to the caller.', ['Choose descriptive function names.', 'Use parameters for inputs.', 'Test functions with several inputs.'])
      ], { question: 'Which keyword defines a function?', options: ['def', 'function', 'func', 'make'], answer: 0, explanation: 'Python functions are defined using def.' })
    ]
  },
  {
    id: 'design', slug: 'ui-design-basics', title: 'UI Design Basics', category: 'Design', level: 'Beginner', duration: '2 hours', icon: 'palette', accent: 'peach',
    description: 'Understand spacing, typography and color to create interfaces that people can use comfortably.',
    outcomes: ['Choose readable typography', 'Use spacing and contrast', 'Plan a simple screen layout'],
    lessons: [
      lesson('ui-1', 'What makes a good interface?', 20, 'Understand the purpose of interface design.', [
        section('Clarity comes first', 'A useful interface helps people identify what to do next without guessing.'),
        section('Visual hierarchy', 'Large headings, clear buttons and consistent groupings help readers scan.', ['Make primary actions obvious.', 'Use short labels.', 'Keep repeated elements consistent.'])
      ], { question: 'What is the purpose of visual hierarchy?', options: ['To use more colors', 'To guide attention', 'To reduce screen size', 'To hide navigation'], answer: 1, explanation: 'Visual hierarchy helps users find important content and actions.' }),
      lesson('ui-2', 'Typography and spacing', 24, 'Create legible and balanced screens.', [
        section('Readable type', 'Body text should be easy to scan with adequate line spacing and contrast.'),
        section('Whitespace', 'Spacing separates sections and connects related elements.', ['Use a consistent spacing scale.', 'Limit the number of type sizes.', 'Check mobile readability.'])
      ], { question: 'What does consistent spacing improve?', options: ['Clarity', 'Network speed', 'File compression', 'Battery life'], answer: 0, explanation: 'Consistent spacing makes layouts easier to understand.' }),
      lesson('ui-3', 'Color and accessibility', 26, 'Choose colors with purpose.', [
        section('Color has a job', 'A small, consistent palette helps users recognize important actions.'),
        section('Contrast', 'Text should stand out clearly from its background.', ['Do not rely on color alone to convey meaning.', 'Keep text legible.', 'Check focus and hover states.'])
      ], { question: 'Should errors be indicated using color alone?', options: ['Yes', 'No', 'Only on desktop', 'Only in forms'], answer: 1, explanation: 'Use text or an icon as well as color so the message is accessible.' })
    ]
  },
  {
    id: 'career', slug: 'career-ready-skills', title: 'Career-Ready Skills', category: 'Career', level: 'All levels', duration: '2 hours', icon: 'briefcase', accent: 'mint',
    description: 'Practice communication, goal setting and presentation skills for your next internship or job.',
    outcomes: ['Write clear professional messages', 'Plan attainable weekly goals', 'Prepare a structured presentation'],
    lessons: [
      lesson('career-1', 'Professional communication', 18, 'Write messages that get to the point.', [
        section('Keep it clear', 'A good professional message explains the purpose, necessary context and next step.'),
        section('Check before sending', 'Review names, dates and attachments before pressing send.', ['Write a clear subject line.', 'Use short paragraphs.', 'End with a specific request or action.'])
      ], { question: 'What makes an email subject effective?', options: ['Unclear wording', 'A clear purpose', 'All caps', 'No subject'], answer: 1, explanation: 'A clear subject helps the recipient understand the purpose.' }),
      lesson('career-2', 'Goals and time management', 22, 'Turn big tasks into manageable steps.', [
        section('Plan the outcome', 'Start with a specific result you want to achieve.'),
        section('Divide and review', 'Break the work into small milestones and review progress regularly.', ['Choose three priorities for the week.', 'Estimate time for each task.', 'Review and adjust your plan.'])
      ], { question: 'Which goal is easiest to evaluate?', options: ['Learn everything', 'Get better soon', 'Finish two lessons by Friday', 'Work more'], answer: 2, explanation: 'A measurable goal includes a clear task and deadline.' }),
      lesson('career-3', 'Presentation fundamentals', 25, 'Deliver an idea clearly to an audience.', [
        section('Tell a simple story', 'A clear presentation moves from problem to solution and evidence.'),
        section('Practice the delivery', 'Use slides to support the message rather than reading them word for word.', ['One key point per slide.', 'Use readable text.', 'Practice with a timer.'])
      ], { question: 'What is a good slide-writing principle?', options: ['One clear point per slide', 'Read every sentence aloud', 'Use tiny text', 'Add all details on one slide'], answer: 0, explanation: 'A focused slide is easier to understand and remember.' })
    ]
  }
];

module.exports = { courses };
