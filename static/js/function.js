/**
 * Created by 80274869 on 2014-9-4.
 */

function calit()
{
    var content = $("#grade").val();
    var type = $("#type").val();
    var chart = {};

    var elements = new Array("课程名", "百分制", "等级制", "4分制", "学分", "学时");
    var ele_eng = new Array("name", "hund", "lett", "four", "cred", "hour");

    var map = {'csv':',', 'space':' ', ',':',', ' ':' ', '空格':' ', '逗号':','};
    if (map[type]) 
    {
        type = map[type];
    }
    else
    {
        alert(type + " 不能使用");
        return 1;
    }

    var lines = content.split(/\r?\n/);

    var table = $('<table border="1"></table>');

    var divs = new Array();
    var findex = 0;

    var row = $('<tr></tr>');
    for (var i = 0; i < elements.length; i++)
    {
        var cell = $('<th>' + elements[i] + '</th>');
        row.append(cell);
    }

    table.append(row);

    var optbox = document.getElementsByName("select");
    var record = new Array();

    for (i = 0; i < lines.length; i++)
    {
        var line = lines[i];
        
        if (type != ' ' && type != '空格' && type != 'space')
        {
            line = line.replace(/\s+/g, "");
        }
        else
        {
            line = line.replace(/\s+/g, " ");
        }
        
        if (line == '' || line == ' ') continue;

        row = $('<tr></tr>');
        
        var fields = line.split(type);
        var c = 0;
        var sgrade = {};
        for (var j = 0; j < elements.length; j++) {
            var text;
            if (optbox[j].checked) {
                text = fields[c];
                c++;
            }
            else if (j == 2) {
                if (!sgrade['hund'])
                    continue;
                text = gpa_letter(sgrade['hund'], chart);
            }
            else if (j == 3) {
                if (!sgrade['hund'] && !sgrade['lett']) {
                    alert(line + '  100分、 ABCD分都没有， 没法算， 再见!');
                    return 1;
                }
                text = gpa_four(sgrade['hund'], sgrade['lett'], chart);
            }
            else {
                text = "";
            }

            sgrade[ele_eng[j]] = text;
            var cell = $('<td>' + text + '</td>');
            row.append(cell);     
        }
        table.append(row);
        record[i] = sgrade;
    }

    $('#content').html('');
    $('#content').append(table);

    result_set = calculator(record);
    for (i = 0; i < result_set.length; i++) {
        $('#sum'+i).val(result_set[i]);
    }
}

function gpa_four(hgrade, lgrade, chart)
{
    var threshold = new Array(90,85,81,78,75,72,68,64,60);
    var letter_val = new Array('A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D');
    var gpa_val = new Array(4.0,3.7,3.3,3.0,2.7,2.3,2.0,1.7,1.0);
    

    hgrade = hgrade - 0;
    for (var i = 0; i < threshold.length; i++) {
        if (!hgrade && lgrade && lgrade == letter_val) {
            result = gpa_val[i];
            break;
        }
        if (hgrade >= threshold[i]) {
            result = gpa_val[i];
            break;
        }
    }
    return result;
}

function gpa_letter(hgrade, chart)
{
    var threshold = new Array(90,85,81,78,75,72,68,64,60);
    var letter_val = new Array('A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D');
    var result = 'F';
    hgrade = hgrade - 0;
    for (var i = 0; i < threshold.length; i++) {
        if (hgrade >= threshold[i]) {
            result = letter_val[i];
            break;
        }
    }
    return result;
}

function calculator(record)
{
    var result;
    var sum_credit = 0;
    var sum_weight_credit = 0;
    var sum_weight_score = 0;
    
    for (var i = 0; i < record.length; i++) {
        var grade = record[i];
        var credit = grade['cred'] - 0;
        var hund = grade['hund'] - 0;
        var four = grade['four'] - 0;
        sum_credit += credit;
        sum_weight_credit += four * credit;
        sum_weight_score  += hund * credit;
    }

    return new Array(sum_credit, sum_weight_credit, 
        sum_weight_credit * 1.0 / sum_credit, sum_weight_score * 1.0 / sum_credit);
}
