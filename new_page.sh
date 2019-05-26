#!/usr/bin/env bash

echo "-----------------------------------------------------"
echo "          Add a new page to the app"
echo "-----------------------------------------------------"
echo ""
echo "Type the name of the new page (camelCase):"
read ccName

CcName=`echo "$ccName" | sed -e "s/\b\(.\)/\u\1/g"`      # CcName = BfLabel     -> Camel Case starting with Uppercase
vName=`echo $ccName | sed -e 's/\([A-Z]\)/-\L\1/g'`      # vName  = bf-label    -> Hypens all lowercase
wName=`echo $ccName"Demo"`                               # wName  = bfLabelDemo -> Camel case sufixed (wrapper comp)

echo ""
echo "A new module + default component is going to be created like:"
echo "    ng generate module pages/$vName -m=app.module"
echo "    ng generate component pages/$vName -m=$vName"
echo ""
echo " Is this ok?"
read x
ng generate module pages/$vName -m=app.module
ng generate component pages/$vName -m=$vName

ccNameComp=$ccName"Component"

#Todo ---> Automate this
echo ""
echo ""
echo "Done. Now you should go to app-routing.module.ts and add the new rout to routes[]:"
echo "  const routes: Routes = ["
echo "    ..."
echo "    { path: '$vName',         component: $ccNameComp },"
echo "  ];"
echo ""
