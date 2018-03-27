# Time Ivy

Time tracking software for hourly billing.

# Spreadheet User Interface

The spreadsheet interface offers keyboard bindings similar to classic
desktop spreadsheet applications.

## Navigate Mode Key Bindings

When not editing a cell, the following keyboard bindings apply:

Hot Key          | Action
---              | ---
Ctrl+i           | Insert a copy of the current row below the active cell
Insert           | "
Delete           | Delete the active cell's contents
F2               | Enter edit mode for the active cell
Enter            | Navigate one cell down
Up Arrow         | Navigate one cell up
Down Arrow       | Navigate one cell down
Left Arrow       | Navigate one cell left
Shift+Tab        | "
Right Arrow      | Navigate one cell right
Tab              | "
Page Up          | Navigate one page up
Page Down        | Navigate one page down
Ctrl+d           | Duplicate cell above
Ctrl+Up Arrow    | Navigate to the first non-empty cell upwards
Ctrl+Down Arrow  | Navigate to the first non-empty cell downwards
Ctrl+Left Arrow  | Navigate to the first non-empty cell leftwards
Ctrl+Right Arrow | Navigate to the first non-empty cell rightwards
Home             | Navigate to the current row's first column
End              | Navigate to the current row's last non-empty column
Ctrl+Home        | Navigate to the first row and first column
Ctrl+End         | Navigate to the last row, and last column
Ctrl+x           | Cut active cell text
Ctrl+c           | Copy active cell text
Ctrl+Insert      | "
Ctrl+v           | Paste copied text into the application
Shift+Insert     | "
Ctrl+z           | Undo the previous action

Most other keys will enter edit mode for the active cell after first
clearing the cell contents.

## Edit Mode Key Bindings

When ending a cell, the following keyboard bindings apply:

Esc         | Enter navigate mode, undo any changes
Hot Key     | Action
---         | ---
Up Arrow    | Enter navigate mode, perform navigation
Down Arrow  | "
Tab         | "
Shift+Tab   | "

## Time Formats

Time can be entered into the system using a wide variety of formats, such as:

Input     | Output
---       | ---
1:00 pm   | 01:00 PM
1:00 p.m. | 01:00 PM
1:00 p    | 01:00 PM
1:00pm    | 01:00 PM
1:00p.m.  | 01:00 PM
1:00p     | 01:00 PM
1 pm      | 01:00 PM
1 p.m.    | 01:00 PM
1 p       | 01:00 PM
1pm       | 01:00 PM
1p.m.     | 01:00 PM
1p        | 01:00 PM
13:00     | 01:00 PM
13        | 01:00 PM
12        | 12:00 PM
2400      | 00:00 AM
1a        | 01:00 AM
100       | 01:00 AM
123       | 01:23 AM
1000      | 10:00 AM
2459      | 00:59 AM
2359      | 11:59 PM
