-- G2 Convert.app — Even Realities G2 Image Converter
-- Double-click to select an image and convert it for G2 display.
-- Also supports drag & drop of one or more images onto the app icon.

on open droppedItems
	repeat with theItem in droppedItems
		my convertFile(POSIX path of theItem)
	end repeat
end open

on run
	set theFile to choose file of type {"public.image"} with prompt "Select an image to convert for Even Realities G2:"
	my convertFile(POSIX path of theFile)
end run

on convertFile(inputPath)
	-- Ask where to save
	set inputName to do shell script "basename " & quoted form of inputPath & " | sed 's/\\.[^.]*$//'"
	
	try
		set savePath to choose file name with prompt "Save G2-converted image as:" default name (inputName & "-g2.png") default location (path to desktop folder)
		set outputPath to POSIX path of savePath
	on error
		display dialog "Save cancelled." with title "G2 Convert" buttons {"OK"} default button "OK" giving up after 3
		return
	end try
	
	-- Run the converter
	set converterScript to "/Users/gael/Documents/GitHub/EvenHub/toolbox/scripts/g2-convert"
	
	try
		set result to do shell script quoted form of converterScript & " " & quoted form of inputPath & " " & quoted form of outputPath
		display notification "Saved as " & (do shell script "basename " & quoted form of outputPath) with title "G2 Convert ✓" subtitle "288×144 — 4-bit greyscale" sound name "Glass"
		
		-- Reveal in Finder
		do shell script "open -R " & quoted form of outputPath
	on error errMsg
		display dialog "Conversion failed:" & return & errMsg with title "G2 Convert ✗" buttons {"OK"} default button "OK" with icon stop
	end try
end convertFile
