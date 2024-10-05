clear
echo Express[Ts] generator from Tu!!
dir=$1
if [ -e $dir ]
    then
    echo Please specify app-name!!
else
    if ! [ -z $dir ]
        then 
        echo Directory does not exist yo!!
        mkdir $dir
    fi
    echo "Generating files..."
    echo '{
        "name": ${}
    }' > $dir/package.json
fi
