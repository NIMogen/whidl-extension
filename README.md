- Adds syntax highlighting, and 2 commands for testing and checking an HDL file
- With the extension loaded in VScode, two buttons should appear in the top right of the nav bar. These buttons correspond to the two commands that have been added.
- The command to test an HDL file relies on the .tst file being in the same directory as the current file, with the same filename (minus the extension). So Mux.hdl should have Mux.tst in the same folder.
- Also, for the commands to work, whidl must be on your PATH