clear
app=$1
apps_dir="apps/"

if [ -z $app ] # String is empty
then
echo Provide app name!!
elif ! [ -e $apps_dir$app ] # File exists
then 
    echo $apps_dir$app does not exist!!
else
echo Running $app...
conc "tsx tsmerge.ts apps/${app}" "turbo dev --filter ${app}"
fi