on run
  set projectFolder to choose folder with prompt "选择动迹 MotionTrace 项目目录"
  do shell script quoted form of ((POSIX path of projectFolder) & "scripts/open-form.sh")
end run

on reopen
  run
end reopen
