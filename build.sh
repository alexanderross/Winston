ENV=$1

echo "Wrangling - building a bin"
cd lib
ruby wrangle.rb $ENV
cd ../

echo "Building keys"
cd keys
./build_keys.sh wayne
cd ../

echo "Clearing current builds"
rm -rf install
mkdir install

cd lib
cd builds
echo "$ENV"
SRC=$ENV"_manifest.json"
echo "SRC IS $SRC"
DEST="../../bin/manifest.json"

rm -f ../../bin/manifest.json
cp $SRC $DEST
echo "Creating install for $ENV"

./../../crxbuild.sh ../../bin ../../keys/winston.pem "../../install/winston.crx"
cp ../../keys/wayne.pem "../../install/winston.pem"


echo "Chances are your console doesn't have a consistent chrome link. I can't load it into chrome automatically. sorry bro."
cd ../../

